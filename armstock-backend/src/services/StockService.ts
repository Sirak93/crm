import type { EntityManager } from "typeorm";
import { ErrorCodes } from "armstock-shared";
import { StockInLine } from "../models/StockInLine";
import { AppError } from "../utils/AppError";

/** Stock is never stored - it is summed from the document lines each time. */
export class StockService {
    /** Runs inside the caller's transaction, after its changes, so a failure rolls them back. */
    static async assertNotNegative(manager: EntityManager, companyUuid: string, productUuids: string[]): Promise<void> {
        if (!productUuids.length) return;

        // Step 12 subtracts the stock-out lines here.
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
}
