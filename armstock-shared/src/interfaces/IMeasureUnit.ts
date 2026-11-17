export interface IMeasureUnit {
    uuid: string;
    /** e.g. "Kilogram" */
    name: string;
    /** e.g. "kg" */
    shortName: string;
    /** kg = yes, piece = no - quantities in this unit may have decimals. */
    allowsDecimals: boolean;
}
