import type { MeasureUnitType } from "../enums/MeasureUnitType";
import type { ILocalizedText } from "./ILocalizedText";

/** One entry of the fixed unit list (MEASURE_UNITS). */
export interface IMeasureUnit {
    name: ILocalizedText;
    shortName: ILocalizedText;
    type: MeasureUnitType;
    /** Size next to the base unit of its type (1 g = 0.001 kg); null for count units. */
    factor: number | null;
    allowsDecimals: boolean;
    /** false = converter only, a product can't be counted in it. */
    isProductUnit: boolean;
}
