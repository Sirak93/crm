import type { MeasureUnit } from "../enums/MeasureUnit";
import type { IProductPayload } from "./IProductPayload";

export interface IProductCreatePayload extends IProductPayload {
    measureUnit: MeasureUnit;
}
