import type { IStockInPack } from "./IStockInPack";

/** The backend works out the total (pack.quantity × pack.count). */
export interface IStockInLinePayload {
    productUuid: string;
    pack: IStockInPack;
}
