import { In, type EntityManager, type SelectQueryBuilder } from "typeorm";
import { ErrorCodes, QUANTITY_DECIMALS, StockOutReason, type IProductQuantity, type ISupplierReturnError } from "armstock-shared";
import { Product } from "../models/Product";
import { StockIn } from "../models/StockIn";
import { StockInLine } from "../models/StockInLine";
import { StockOut } from "../models/StockOut";
import { StockOutLine } from "../models/StockOutLine";
import { Supplier } from "../models/Supplier";
import { AppError } from "../utils/AppError";

const QUANTITY_SCALE = 10 ** QUANTITY_DECIMALS;
const round = (value: number): number => Math.round(value * QUANTITY_SCALE) / QUANTITY_SCALE;

interface ISupplierTotals {
    received: number;
    returned: number;
}

/**
 * A supplier can't get back more than it brought: brought (its stock-in lines) minus already
 * returned (its Returned stock-outs). Counted from the lines each time, like stock.
 */
export class SupplierReturnService {
    /** Products that came in from this supplier at least once - the return picker. */
    static whereSuppliedBy(qb: SelectQueryBuilder<Product>, supplierUuid: string): SelectQueryBuilder<Product> {
        const supplied = qb.subQuery()
            .select("1")
            .from(StockInLine, "line")
            .innerJoin(StockIn, "doc", "doc.uuid = line.stockInUuid")
            .where("line.productUuid = product.uuid")
            .andWhere("doc.supplierUuid = :suppliedByUuid")
            .getQuery();
        return qb.andWhere(`EXISTS ${supplied}`, { suppliedByUuid: supplierUuid });
    }

    /**
     * Runs inside a Returned stock-out save, after the product lock. `wanted` is what this
     * document returns per product; the document itself is left out of "already returned".
     */
    static async assertReturnFits(
        manager: EntityManager,
        companyUuid: string,
        supplierUuid: string,
        stockOutUuid: string,
        wanted: Map<string, number>,
    ): Promise<void> {
        const totals = await SupplierReturnService.totals(manager, companyUuid, supplierUuid, [...wanted.keys()], stockOutUuid);
        const over = [...wanted].filter(([uuid, quantity]) => {
            const { received, returned } = totals.get(uuid) ?? { received: 0, returned: 0 };
            return round(received - returned - quantity) < 0;
        });
        if (!over.length) return;

        await SupplierReturnService.fail(manager, ErrorCodes.STOCK_OUT.RETURN_EXCEEDS_SUPPLIER, supplierUuid, over.map(([uuid]) => {
            const { received, returned } = totals.get(uuid) ?? { received: 0, returned: 0 };
            return [uuid, Math.max(0, round(received - returned))];
        }));
    }

    /**
     * Runs inside a stock-in edit/delete, after its changes: what the old supplier brought must
     * stay at least what was returned to it. The new supplier only gains, so it is not checked.
     */
    static async assertNotBelowReturned(manager: EntityManager, companyUuid: string, supplierUuid: string, productUuids: string[]): Promise<void> {
        if (!productUuids.length) return;
        const totals = await SupplierReturnService.totals(manager, companyUuid, supplierUuid, productUuids);
        const below = [...totals].filter(([, t]) => round(t.received - t.returned) < 0);
        if (!below.length) return;

        await SupplierReturnService.fail(manager, ErrorCodes.STOCK_IN.BELOW_RETURNED, supplierUuid, below.map(([uuid, t]) => [uuid, t.returned]));
    }

    private static async totals(
        manager: EntityManager,
        companyUuid: string,
        supplierUuid: string,
        productUuids: string[],
        exceptStockOutUuid?: string,
    ): Promise<Map<string, ISupplierTotals>> {
        const sumBy = (lineEntity: typeof StockInLine | typeof StockOutLine, docEntity: typeof StockIn | typeof StockOut, docKey: string) =>
            manager.createQueryBuilder(lineEntity, "line")
                .innerJoin(docEntity, "doc", `doc.uuid = line.${docKey}`)
                .select("line.productUuid", "productUuid")
                .addSelect("SUM(line.quantity)", "quantity")
                .where("line.companyUuid = :companyUuid", { companyUuid })
                .andWhere("line.productUuid IN (:...productUuids)", { productUuids })
                .andWhere("doc.supplierUuid = :supplierUuid", { supplierUuid })
                .groupBy("line.productUuid");

        const returnedQb = sumBy(StockOutLine, StockOut, "stockOutUuid").andWhere("doc.reason = :returned", { returned: StockOutReason.RETURNED });
        if (exceptStockOutUuid) returnedQb.andWhere("doc.uuid != :exceptStockOutUuid", { exceptStockOutUuid });

        const [received, returned] = await Promise.all([
            sumBy(StockInLine, StockIn, "stockInUuid").getRawMany<{ productUuid: string; quantity: string }>(),
            returnedQb.getRawMany<{ productUuid: string; quantity: string }>(),
        ]);

        const totals = new Map<string, ISupplierTotals>();
        for (const row of received) totals.set(row.productUuid, { received: Number(row.quantity), returned: 0 });
        for (const row of returned) {
            const current = totals.get(row.productUuid) ?? { received: 0, returned: 0 };
            totals.set(row.productUuid, { ...current, returned: Number(row.quantity) });
        }
        return totals;
    }

    /** Throws the error with each product's name, unit, and the quantity to show. */
    private static async fail(
        manager: EntityManager,
        error: { CODE: string; STATUS: number },
        supplierUuid: string,
        quantities: [string, number][],
    ): Promise<never> {
        const [supplier, products] = await Promise.all([
            manager.findOne(Supplier, { where: { uuid: supplierUuid } }),
            manager.find(Product, { where: { uuid: In(quantities.map(([uuid]) => uuid)) } }),
        ]);
        const productMap = new Map(products.map((p) => [p.uuid, p]));
        const data: ISupplierReturnError = {
            supplierName: supplier?.name ?? "",
            products: quantities
                .map(([uuid, quantity]): IProductQuantity => ({
                    name: productMap.get(uuid)?.name ?? "",
                    measureUnit: productMap.get(uuid)!.measureUnit,
                    quantity,
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        };
        throw new AppError(error, undefined, undefined, { supplierUuid, quantities }, data);
    }
}
