import type { MeasureUnit } from "../enums/MeasureUnit";

/** One product in a "not enough stock" error (`error.meta` is a list of these). */
export interface IStockShortage {
    name: string;
    measureUnit: MeasureUnit;
    /** What this document could use - may be below zero if stock was already short. */
    available: number;
}
