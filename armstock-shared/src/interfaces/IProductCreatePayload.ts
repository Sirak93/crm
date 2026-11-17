import type { IProductPayload } from "./IProductPayload";

export interface IProductCreatePayload extends IProductPayload {
    measureUnitUuid: string;
}
