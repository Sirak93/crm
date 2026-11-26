import type { MeasureUnit } from "../enums/MeasureUnit";

/** The backend works out the total (packQuantity × packCount). */
export interface IStockInLinePayload {
    productUuid: string;
    /** One pack's amount, in the product's unit. */
    packQuantity: number;
    /** The unit the amount was typed in; same type as the product's unit. */
    packUnit: MeasureUnit;
    packCount: number;
}
