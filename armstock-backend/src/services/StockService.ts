import { Brackets, In, type EntityManager, type ObjectLiteral, type SelectQueryBuilder } from "typeorm";
import {
    ErrorCodes,
    ProductStatus,
    QUANTITY_DECIMALS,
    type IPaginationMeta,
    type IStockBalance,
    type IStockBalanceSummary,
    type IStockLineProduct,
    type IStockShortage,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { MeasureUnit } from "../models/MeasureUnit";
import { Product } from "../models/Product";
import { ProductCategory } from "../models/ProductCategory";
import { StockInLine } from "../models/StockInLine";
import { StockOutLine } from "../models/StockOutLine";
import { AppError } from "../utils/AppError";
import type { StockBalanceFilters, StockBalanceQuery } from "../schemas/StockSchema";

// Built on the "stock_in" and "stock_out" subqueries from joinStock.
const QUANTITY = "(COALESCE(stock_in.quantity, 0) - COALESCE(stock_out.quantity, 0))";
const AVG_PRICE = "stock_in.total / NULLIF(stock_in.quantity, 0)";
const VALUE = `COALESCE(ROUND(${QUANTITY} * ${AVG_PRICE}, 2), 0)`;
const QUANTITY_SCALE = 10 ** QUANTITY_DECIMALS;

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

    /** Needs the product's measureUnit loaded. */
    static toLineProduct(product: Product): IStockLineProduct {
        return {
            uuid: product.uuid,
            name: product.name,
            code: product.code,
            status: product.status,
            unitShortName: product.measureUnit!.shortName,
            allowsDecimals: product.measureUnit!.allowsDecimals,
        };
    }

    /** Needs the product's measureUnit loaded. */
    static assertQuantityFitsUnit(product: Product, quantity: number): void {
        if (!product.measureUnit!.allowsDecimals && !Number.isInteger(quantity)) {
            throw new AppError(ErrorCodes.PRODUCT.QUANTITY_NOT_WHOLE, undefined, undefined, { uuid: product.uuid, quantity });
        }
    }

    /** Active products, plus archived ones that still have stock - what a stock-out may pick. */
    static whereActiveOrInStock(qb: SelectQueryBuilder<Product>): SelectQueryBuilder<Product> {
        const sum = (entity: typeof StockInLine | typeof StockOutLine) => qb.subQuery()
            .select("COALESCE(SUM(line.quantity), 0)")
            .from(entity, "line")
            .where("line.companyUuid = product.companyUuid")
            .andWhere("line.productUuid = product.uuid")
            .getQuery();
        return qb.andWhere(`(product.status = :activeStatus OR ${sum(StockInLine)} - ${sum(StockOutLine)} > 0)`, {
            activeStatus: ProductStatus.ACTIVE,
        });
    }

    /** Adds each line's quantity × sign to its product - builds the add-back map for assertNotNegative. */
    static addQuantities(map: Map<string, number>, lines: { productUuid: string; quantity: number }[], sign: 1 | -1): Map<string, number> {
        for (const line of lines) map.set(line.productUuid, (map.get(line.productUuid) ?? 0) + sign * line.quantity);
        return map;
    }

    /**
     * First step of every stock save: a second save on the same products waits until this one ends,
     * so its check sees this one's lines. Sorted so two saves never wait on each other (deadlock).
     * NO KEY UPDATE, not UPDATE: inserting lines takes a KEY SHARE lock on the product (foreign key),
     * which UPDATE would block - a stock-in create could then deadlock with a stock save.
     */
    static async lockProducts(manager: EntityManager, companyUuid: string, productUuids: string[]): Promise<void> {
        if (!productUuids.length) return;
        await manager
            .createQueryBuilder(Product, "product")
            .select("product.uuid")
            .where("product.companyUuid = :companyUuid", { companyUuid })
            .andWhere("product.uuid IN (:...productUuids)", { productUuids })
            .orderBy("product.uuid", "ASC")
            .setLock("for_no_key_update")
            .getMany();
    }

    /**
     * Runs inside the caller's transaction, after its changes, so a failure rolls them back.
     * `addBack` keys are the products to check; the value turns the new total into what was
     * available to this document (e.g. the document's own stock-out quantity).
     */
    static async assertNotNegative(manager: EntityManager, companyUuid: string, addBack: Map<string, number>): Promise<void> {
        const productUuids = [...addBack.keys()];
        if (!productUuids.length) return;

        const qb = manager
            .createQueryBuilder(Product, "product")
            .innerJoin("product.measureUnit", "unit")
            .select("product.uuid", "uuid")
            .addSelect("product.name", "name")
            .addSelect("unit.shortName", "unitShortName")
            .addSelect(QUANTITY, "quantity")
            .where("product.companyUuid = :companyUuid", { companyUuid })
            .andWhere("product.uuid IN (:...productUuids)", { productUuids })
            .andWhere(`${QUANTITY} < 0`)
            .orderBy("product.name", "ASC");
        const negative = await StockService.joinStock(qb, "line.productUuid IN (:...productUuids)")
            .getRawMany<{ uuid: string; name: string; unitShortName: string; quantity: string }>();

        if (negative.length) {
            const shortages: IStockShortage[] = negative.map((row) => ({
                name: row.name,
                unitShortName: row.unitShortName,
                available: Math.round((Number(row.quantity) + addBack.get(row.uuid)!) * QUANTITY_SCALE) / QUANTITY_SCALE,
            }));
            throw new AppError(ErrorCodes.STOCK.NOT_ENOUGH, undefined, undefined, { productUuids: negative.map((r) => r.uuid) }, shortages);
        }
    }

    /** Adds the "stock_in" and "stock_out" line sums per product; `lineFilter` narrows the lines summed. */
    private static joinStock<T extends Product>(qb: SelectQueryBuilder<T>, lineFilter?: string): SelectQueryBuilder<T> {
        const sums = (entity: typeof StockInLine | typeof StockOutLine, withTotal: boolean) => (sub: SelectQueryBuilder<ObjectLiteral>) => {
            sub.from(entity, "line")
                .select("line.productUuid", "product_uuid")
                .addSelect("SUM(line.quantity)", "quantity")
                .where("line.companyUuid = :companyUuid")
                .groupBy("line.productUuid");
            if (withTotal) sub.addSelect("SUM(line.total)", "total");
            if (lineFilter) sub.andWhere(lineFilter);
            return sub;
        };
        return qb
            .leftJoin(sums(StockInLine, true), "stock_in", "stock_in.product_uuid = product.uuid")
            .leftJoin(sums(StockOutLine, false), "stock_out", "stock_out.product_uuid = product.uuid");
    }

    /** Products with their stock sums; the list and its summary share it, so the two always match. */
    private balanceQuery(companyUuid: string, filters: StockBalanceFilters, inStockOnly: boolean): SelectQueryBuilder<Product> {
        const { search, categoryUuid } = filters;
        const qb = StockService.joinStock(this.productRepo.createQueryBuilder("product"))
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
