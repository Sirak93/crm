import type { MeasureUnit } from "armstock-shared";

/** The calling company's own records, for building a valid body. */
export interface IOwnRefs {
    categoryUuid: string;
    productUuid: string;
    productUnit: MeasureUnit;
    roleUuid: string;
}
