import { Brackets, In, type EntityManager, type SelectQueryBuilder } from "typeorm";
import { ErrorCodes, ProductStatus, type IPaginationMeta, type IStockBalance, type IStockBalanceSummary } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { MeasureUnit } from "../models/MeasureUnit";
import { Product } from "../models/Product";
import { ProductCategory } from "../models/ProductCategory";
import { StockInLine } from "../models/StockInLine";
import { AppError } from "../utils/AppError";
import type { StockBalanceFilters, StockBalanceQuery } from "../schemas/StockSchema";

// Built on the "stock" subquery from balanceQuery. Step 13 subtracts the stock-out lines from QUANTITY.
const QUANTITY = "COALESCE(stock.in_quantity, 0)";
const AVG_PRICE = "stock.in_total / NULLIF(stock.in_quantity, 0)";
const VALUE = `COALESCE(ROUND(${QUANTITY} * ${AVG_PRICE}, 2), 0)`;

interface IBalanceRow {
    uuid: string;
    name: string;
    code: string | null;
    status: ProductStatus;
    categoryUuid: string;
    measureUnitUuid: string;
    quantity: string;
    avgPrice: string | null;
    value: string;
}

/** Stock is never stored - it is summed from the document lines each time. */
export class StockService {
    private productRepo = AppDataSource.getRepository(Product);

    /** Runs inside the caller's transaction, after its changes, so a failure rolls them back. */
    static async assertNotNegative(manager: EntityManager, companyUuid: string, productUuids: string[]): Promise<void> {
        if (!productUuids.length) return;

        // Step 13 subtracts the stock-out lines here.
        const negative = await manager
            .createQueryBuilder(StockInLine, "line")
            .select("line.productUuid", "productUuid")
            .where("line.companyUuid = :companyUuid", { companyUuid })
            .andWhere("line.productUuid IN (:...productUuids)", { productUuids })
            .groupBy("line.productUuid")
            .having("SUM(line.quantity) < 0")
            .getRawMany<{ productUuid: string }>();

        if (negative.length) {
            throw new AppError(ErrorCodes.STOCK.NOT_ENOUGH, undefined, undefined, { productUuids: negative.map((r) => r.productUuid) });
        }
    }

    /** Products with their stock-in sums; the list and its summary share it, so the two always match. */
    private balanceQuery(companyUuid: string, filters: StockBalanceFilters, inStockOnly: boolean): SelectQueryBuilder<Product> {
        const { search, categoryUuid } = filters;
        const qb = this.productRepo
            .createQueryBuilder("product")
            .leftJoin(
                (sub) => sub
                    .from(StockInLine, "line")
                    .select("line.productUuid", "product_uuid")
                    .addSelect("SUM(line.quantity)", "in_quantity")
                    .addSelect("SUM(line.total)", "in_total")
                    .where("line.companyUuid = :companyUuid")
                    .groupBy("line.productUuid"),
                "stock",
                "stock.product_uuid = product.uuid",
            )
            .where("product.companyUuid = :companyUuid", { companyUuid })
            // Archived products show only while they still have stock.
            .andWhere(`(product.status = :active OR ${QUANTITY} > 0)`, { active: ProductStatus.ACTIVE });

        if (search) {
            qb.andWhere(new Brackets((w) => {
                w.where("product.name ILIKE :search", { search: `%${search}%` }).orWhere("product.code ILIKE :search");
            }));
        }
        if (categoryUuid) qb.andWhere("product.categoryUuid = :categoryUuid", { categoryUuid });
        if (inStockOnly) qb.andWhere(`${QUANTITY} > 0`);
        return qb;
    }

    /** Units and categories of one page, by bounded `uuid IN (...)` lookups instead of joins on the paginated query. */
    private async toBalances(companyUuid: string, rows: IBalanceRow[]): Promise<IStockBalance[]> {
        const unitUuids = [...new Set(rows.map((r) => r.measureUnitUuid))];
        const categoryUuids = [...new Set(rows.map((r) => r.categoryUuid))];
        const [units, categories] = await Promise.all([
            unitUuids.length ? AppDataSource.getRepository(MeasureUnit).find({ where: { uuid: In(unitUuids), companyUuid } }) : [],
            categoryUuids.length ? AppDataSource.getRepository(ProductCategory).find({ where: { uuid: In(categoryUuids), companyUuid } }) : [],
        ]);
        const unitMap = new Map(units.map((u) => [u.uuid, u.shortName]));
        const categoryMap = new Map(categories.map((c) => [c.uuid, c.name]));

        return rows.map((row) => ({
            uuid: row.uuid,
            name: row.name,
            code: row.code,
            status: row.status,
            categoryName: categoryMap.get(row.categoryUuid) ?? "",
            unitShortName: unitMap.get(row.measureUnitUuid) ?? "",
            quantity: Number(row.quantity),
            avgPrice: row.avgPrice === null ? null : Number(row.avgPrice),
            value: Number(row.value),
        }));
    }

    async balanceSummary(companyUuid: string, filters: StockBalanceFilters): Promise<IStockBalanceSummary> {
        const row = await this.balanceQuery(companyUuid, filters, true)
            .select(`COALESCE(SUM(${VALUE}), 0)`, "totalValue")
            .addSelect("COUNT(*)", "productCount")
            .getRawOne<{ totalValue: string; productCount: string }>();

        return {
            totalValue: Number(row?.totalValue ?? 0),
            productCount: Number(row?.productCount ?? 0),
        };
    }

    async balanceList(companyUuid: string, query: StockBalanceQuery): Promise<{ items: IStockBalance[]; meta: IPaginationMeta }> {
        const { page, pageSize, inStockOnly } = query;

        const [rows, total] = await Promise.all([
            this.balanceQuery(companyUuid, query, inStockOnly)
                .select("product.uuid", "uuid")
                .addSelect("product.name", "name")
                .addSelect("product.code", "code")
                .addSelect("product.status", "status")
                .addSelect("product.categoryUuid", "categoryUuid")
                .addSelect("product.measureUnitUuid", "measureUnitUuid")
                .addSelect(QUANTITY, "quantity")
                .addSelect(`ROUND(${AVG_PRICE}, 2)`, "avgPrice")
                .addSelect(VALUE, "value")
                .orderBy("product.name", "ASC")
                .addOrderBy("product.uuid", "ASC")
                .offset((page - 1) * pageSize)
                .limit(pageSize)
                .getRawMany<IBalanceRow>(),
            this.balanceQuery(companyUuid, query, inStockOnly).getCount(),
        ]);

        return {
            items: await this.toBalances(companyUuid, rows),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }
}
