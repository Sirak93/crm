import { Brackets, In, type EntityManager, type ObjectLiteral, type SelectQueryBuilder } from "typeorm";
import {
    ErrorCodes,
    MEASURE_UNITS,
    MeasureUnit,
    ProductStatus,
    QUANTITY_DECIMALS,
    RECIPE_QUANTITY_DECIMALS,
    StockOutDepartment,
    type IKitchenQuantity,
    type IPaginationMeta,
    type IStockBalance,
    type IStockBalanceSummary,
    type IStockLineProduct,
    type IStockMovement,
    type IStockShortage,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Product } from "../models/Product";
import { ProductCategory } from "../models/ProductCategory";
import { StockInLine } from "../models/StockInLine";
import { StockOutLine } from "../models/StockOutLine";
import { StockOutRecipeLine } from "../models/StockOutRecipeLine";
import { AppError, type ErrorDef } from "../utils/AppError";
import type { KitchenBalanceQuery, StockBalanceFilters, StockBalanceQuery, StockMovementQuery } from "../schemas/StockSchema";

// Built on the "stock_in" and "stock_out" subqueries from joinStock.
const QUANTITY = "(COALESCE(stock_in.quantity, 0) - COALESCE(stock_out.quantity, 0))";
// Built on the "kitchen_in" and "kitchen_used" subqueries from joinKitchen.
const KITCHEN_QUANTITY = "(COALESCE(kitchen_in.quantity, 0) - COALESCE(kitchen_used.quantity, 0))";

// Built on the "move_in" and "move_out" subqueries from joinMovement.
const MOVEMENT_INITIAL = "(COALESCE(move_in.before, 0) - COALESCE(move_out.before, 0))";
const MOVEMENT_IN = "COALESCE(move_in.inside, 0)";
const MOVEMENT_OUT = "COALESCE(move_out.inside, 0)";
// Lines, not quantities: a stock-out line with total 0 is still a movement.
const MOVEMENT_LINES = "(COALESCE(move_in.lines, 0) + COALESCE(move_out.lines, 0))";

/** How one stock (S or K) is summed and reported when it would go below zero. */
interface IStockKind {
    quantity: string;
    join: <T extends Product>(qb: SelectQueryBuilder<T>, lineFilter?: string) => SelectQueryBuilder<T>;
    decimals: number;
    error: ErrorDef;
}

interface IMovementRow {
    uuid: string;
    name: string;
    status: ProductStatus;
    measureUnit: MeasureUnit;
    initial: string;
    incoming: string;
    outgoing: string;
    final: string;
}

interface IBalanceRow {
    uuid: string;
    name: string;
    code: string | null;
    status: ProductStatus;
    categoryUuid: string;
    measureUnit: MeasureUnit;
    quantity: string;
}

/** Stock is never stored - it is summed from the document lines each time. */
export class StockService {
    private productRepo = AppDataSource.getRepository(Product);

    static toLineProduct(product: Product): IStockLineProduct {
        return {
            uuid: product.uuid,
            name: product.name,
            code: product.code,
            status: product.status,
            measureUnit: product.measureUnit,
            receivedAs: product.receivedAs,
        };
    }

    static assertQuantityFitsUnit(product: Product, quantity: number): void {
        if (!MEASURE_UNITS[product.measureUnit].allowsDecimals && !Number.isInteger(quantity)) {
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
        await StockService.assertKindNotNegative(manager, companyUuid, addBack, StockService.STORE);
    }

    /** The same for the kitchen balance (K); `addBack` turns the new K into what this document had for its recipes. */
    static async assertKitchenNotNegative(manager: EntityManager, companyUuid: string, addBack: Map<string, number>): Promise<void> {
        await StockService.assertKindNotNegative(manager, companyUuid, addBack, StockService.KITCHEN);
    }

    private static async assertKindNotNegative(
        manager: EntityManager,
        companyUuid: string,
        addBack: Map<string, number>,
        kind: IStockKind,
    ): Promise<void> {
        const productUuids = [...addBack.keys()];
        if (!productUuids.length) return;

        const qb = manager
            .createQueryBuilder(Product, "product")
            .select("product.uuid", "uuid")
            .addSelect("product.name", "name")
            .addSelect("product.measureUnit", "measureUnit")
            .addSelect(kind.quantity, "quantity")
            .where("product.companyUuid = :companyUuid", { companyUuid })
            .andWhere("product.uuid IN (:...productUuids)", { productUuids })
            .andWhere(`${kind.quantity} < 0`)
            .orderBy("product.name", "ASC");
        const negative = await kind.join(qb, "line.productUuid IN (:...productUuids)")
            .getRawMany<{ uuid: string; name: string; measureUnit: MeasureUnit; quantity: string }>();

        if (negative.length) {
            const shortages: IStockShortage[] = negative.map((row) => ({
                name: row.name,
                measureUnit: row.measureUnit,
                available: Number((Number(row.quantity) + addBack.get(row.uuid)!).toFixed(kind.decimals)),
            }));
            throw new AppError(kind.error, undefined, undefined, { productUuids: negative.map((r) => r.uuid) }, shortages);
        }
    }

    /** Adds the "stock_in" and "stock_out" line sums per product; `lineFilter` narrows the lines summed. */
    private static joinStock<T extends Product>(qb: SelectQueryBuilder<T>, lineFilter?: string): SelectQueryBuilder<T> {
        const sums = (entity: typeof StockInLine | typeof StockOutLine) => (sub: SelectQueryBuilder<ObjectLiteral>) => {
            sub.from(entity, "line")
                .select("line.productUuid", "product_uuid")
                .addSelect("SUM(line.quantity)", "quantity")
                .where("line.companyUuid = :companyUuid")
                .groupBy("line.productUuid");
            if (lineFilter) sub.andWhere(lineFilter);
            return sub;
        };
        return qb
            .leftJoin(sums(StockInLine), "stock_in", "stock_in.product_uuid = product.uuid")
            .leftJoin(sums(StockOutLine), "stock_out", "stock_out.product_uuid = product.uuid");
    }

    /**
     * Adds the "kitchen_in" (totals issued to the kitchen) and "kitchen_used" (recipe needs) sums per product.
     * Only Issued docs have the Kitchen department and recipe rows, so no reason filter is needed.
     */
    private static joinKitchen<T extends Product>(qb: SelectQueryBuilder<T>, lineFilter?: string): SelectQueryBuilder<T> {
        const sums = (entity: typeof StockOutLine | typeof StockOutRecipeLine, column: string, kitchenOnly: boolean) =>
            (sub: SelectQueryBuilder<ObjectLiteral>) => {
                sub.from(entity, "line")
                    .select("line.productUuid", "product_uuid")
                    .addSelect(`SUM(line.${column})`, "quantity")
                    .where("line.companyUuid = :companyUuid")
                    .groupBy("line.productUuid");
                if (kitchenOnly) sub.andWhere("line.department = :kitchenDepartment");
                if (lineFilter) sub.andWhere(lineFilter);
                return sub;
            };
        return qb
            .leftJoin(sums(StockOutLine, "quantity", true), "kitchen_in", "kitchen_in.product_uuid = product.uuid")
            .leftJoin(sums(StockOutRecipeLine, "neededQuantity", false), "kitchen_used", "kitchen_used.product_uuid = product.uuid")
            .setParameter("kitchenDepartment", StockOutDepartment.KITCHEN);
    }

    private static readonly STORE: IStockKind = {
        quantity: QUANTITY,
        join: StockService.joinStock,
        decimals: QUANTITY_DECIMALS,
        error: ErrorCodes.STOCK.NOT_ENOUGH,
    };

    // Recipe needs have 6 decimals, so K does too.
    private static readonly KITCHEN: IStockKind = {
        quantity: KITCHEN_QUANTITY,
        join: StockService.joinKitchen,
        decimals: RECIPE_QUANTITY_DECIMALS,
        error: ErrorCodes.STOCK.KITCHEN_NOT_ENOUGH,
    };

    /** Products with their S or K sums; a list and its summary share it, so the two always match. */
    private balanceQuery(companyUuid: string, filters: StockBalanceFilters, inStockOnly: boolean, kind = StockService.STORE): SelectQueryBuilder<Product> {
        const { search, categoryUuid } = filters;
        const qb = kind.join(this.productRepo.createQueryBuilder("product"))
            .where("product.companyUuid = :companyUuid", { companyUuid })
            // Archived products show only while they still have stock.
            .andWhere(`(product.status = :active OR ${kind.quantity} > 0)`, { active: ProductStatus.ACTIVE });

        if (search) {
            qb.andWhere(new Brackets((w) => {
                w.where("product.name ILIKE :search", { search: `%${search}%` }).orWhere("product.code ILIKE :search");
            }));
        }
        if (categoryUuid) qb.andWhere("product.categoryUuid = :categoryUuid", { categoryUuid });
        if (inStockOnly) qb.andWhere(`${kind.quantity} > 0`);
        return qb;
    }

    /** Categories of one page, by a bounded `uuid IN (...)` lookup instead of a join on the paginated query. */
    private async toBalances(companyUuid: string, rows: IBalanceRow[]): Promise<IStockBalance[]> {
        const categoryUuids = [...new Set(rows.map((r) => r.categoryUuid))];
        const categories = categoryUuids.length
            ? await AppDataSource.getRepository(ProductCategory).find({ where: { uuid: In(categoryUuids), companyUuid } })
            : [];
        const categoryMap = new Map(categories.map((c) => [c.uuid, c.name]));

        return rows.map((row) => ({
            uuid: row.uuid,
            name: row.name,
            code: row.code,
            status: row.status,
            categoryName: categoryMap.get(row.categoryUuid) ?? "",
            measureUnit: row.measureUnit,
            quantity: Number(row.quantity),
        }));
    }

    async balanceSummary(companyUuid: string, filters: StockBalanceFilters): Promise<IStockBalanceSummary> {
        const row = await this.balanceQuery(companyUuid, filters, true)
            .select("COUNT(*)", "productCount")
            .getRawOne<{ productCount: string }>();

        return {
            productCount: Number(row?.productCount ?? 0),
        };
    }

    async balanceList(companyUuid: string, query: StockBalanceQuery): Promise<{ items: IStockBalance[]; meta: IPaginationMeta }> {
        return this.pagedBalances(companyUuid, query, query.inStockOnly, StockService.STORE);
    }

    /** Products the kitchen still has (K above 0). */
    async kitchenBalanceList(companyUuid: string, query: KitchenBalanceQuery): Promise<{ items: IStockBalance[]; meta: IPaginationMeta }> {
        return this.pagedBalances(companyUuid, query, true, StockService.KITCHEN);
    }

    /** Every product with K above 0 - the stock-out form shows it next to the totals. */
    async kitchenQuantities(companyUuid: string): Promise<IKitchenQuantity[]> {
        const rows = await StockService.joinKitchen(this.productRepo.createQueryBuilder("product"))
            .select("product.uuid", "productUuid")
            .addSelect(KITCHEN_QUANTITY, "quantity")
            .where("product.companyUuid = :companyUuid", { companyUuid })
            .andWhere(`${KITCHEN_QUANTITY} > 0`)
            .getRawMany<{ productUuid: string; quantity: string }>();
        return rows.map((row) => ({ productUuid: row.productUuid, quantity: Number(row.quantity) }));
    }

    private async pagedBalances(
        companyUuid: string,
        query: StockBalanceQuery | KitchenBalanceQuery,
        inStockOnly: boolean,
        kind: IStockKind,
    ): Promise<{ items: IStockBalance[]; meta: IPaginationMeta }> {
        const { page, pageSize } = query;

        const [rows, total] = await Promise.all([
            this.balanceQuery(companyUuid, query, inStockOnly, kind)
                .select("product.uuid", "uuid")
                .addSelect("product.name", "name")
                .addSelect("product.code", "code")
                .addSelect("product.status", "status")
                .addSelect("product.categoryUuid", "categoryUuid")
                .addSelect("product.measureUnit", "measureUnit")
                .addSelect(kind.quantity, "quantity")
                .orderBy("product.name", "ASC")
                .addOrderBy("product.uuid", "ASC")
                .offset((page - 1) * pageSize)
                .limit(pageSize)
                .getRawMany<IBalanceRow>(),
            this.balanceQuery(companyUuid, query, inStockOnly, kind).getCount(),
        ]);

        return {
            items: await this.toBalances(companyUuid, rows),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    /** Initial, in, out and final per product; lines after "to" are left out, lines before "from" make the initial stock. */
    async movementList(companyUuid: string, query: StockMovementQuery): Promise<{ items: IStockMovement[]; meta: IPaginationMeta }> {
        const { page, pageSize } = query;

        const [rows, total] = await Promise.all([
            this.movementQuery(companyUuid, query)
                .select("product.uuid", "uuid")
                .addSelect("product.name", "name")
                .addSelect("product.status", "status")
                .addSelect("product.measureUnit", "measureUnit")
                .addSelect(MOVEMENT_INITIAL, "initial")
                .addSelect(MOVEMENT_IN, "incoming")
                .addSelect(MOVEMENT_OUT, "outgoing")
                .addSelect(`${MOVEMENT_INITIAL} + ${MOVEMENT_IN} - ${MOVEMENT_OUT}`, "final")
                .orderBy("product.name", "ASC")
                .addOrderBy("product.uuid", "ASC")
                .offset((page - 1) * pageSize)
                .limit(pageSize)
                .getRawMany<IMovementRow>(),
            this.movementQuery(companyUuid, query).getCount(),
        ]);

        return {
            items: rows.map((row) => ({
                uuid: row.uuid,
                name: row.name,
                status: row.status,
                measureUnit: row.measureUnit,
                initial: Number(row.initial),
                incoming: Number(row.incoming),
                outgoing: Number(row.outgoing),
                final: Number(row.final),
            })),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    /** Archived products are not left out - a range in the past may have their movement. */
    private movementQuery(companyUuid: string, query: StockMovementQuery): SelectQueryBuilder<Product> {
        const { search, categoryUuid, withoutMovement } = query;
        const qb = this.joinMovement(this.productRepo.createQueryBuilder("product"), query)
            .where("product.companyUuid = :companyUuid", { companyUuid });

        if (search) {
            qb.andWhere(new Brackets((w) => {
                w.where("product.name ILIKE :search", { search: `%${search}%` }).orWhere("product.code ILIKE :search");
            }));
        }
        if (categoryUuid) qb.andWhere("product.categoryUuid = :categoryUuid", { categoryUuid });
        // Stock never goes below 0, so "has stock" is initial above 0.
        qb.andWhere(withoutMovement ? `(${MOVEMENT_LINES} > 0 OR ${MOVEMENT_INITIAL} > 0)` : `${MOVEMENT_LINES} > 0`);
        return qb;
    }

    /** Adds the "move_in" and "move_out" sums per product: before "from" and inside the range, plus the line count inside. */
    private joinMovement(qb: SelectQueryBuilder<Product>, { dateFrom, dateTo }: StockMovementQuery): SelectQueryBuilder<Product> {
        const inside = dateFrom ? " FILTER (WHERE line.date >= :dateFrom)" : "";
        const sums = (entity: typeof StockInLine | typeof StockOutLine) => (sub: SelectQueryBuilder<ObjectLiteral>) => {
            sub.from(entity, "line")
                .select("line.productUuid", "product_uuid")
                .addSelect(dateFrom ? "SUM(line.quantity) FILTER (WHERE line.date < :dateFrom)" : "0", "before")
                .addSelect(`SUM(line.quantity)${inside}`, "inside")
                .addSelect(`COUNT(*)${inside}`, "lines")
                .where("line.companyUuid = :companyUuid")
                .groupBy("line.productUuid");
            if (dateTo) sub.andWhere("line.date <= :dateTo");
            return sub;
        };
        qb.leftJoin(sums(StockInLine), "move_in", "move_in.product_uuid = product.uuid")
            .leftJoin(sums(StockOutLine), "move_out", "move_out.product_uuid = product.uuid");
        if (dateFrom) qb.setParameter("dateFrom", new Date(dateFrom));
        if (dateTo) qb.setParameter("dateTo", new Date(dateTo));
        return qb;
    }
}
