import { MeasureUnit } from "../enums/MeasureUnit";
import { MeasureUnitType } from "../enums/MeasureUnitType";
import type { IMeasureUnit } from "../interfaces/IMeasureUnit";

/** The fixed unit list - adding a unit is a code change. Users never see or change the factors. */
export const MEASURE_UNITS: Readonly<Record<MeasureUnit, IMeasureUnit>> = {
    [MeasureUnit.PIECE]: {
        name: { hy: "Հատ", en: "Piece" },
        shortName: { hy: "հատ", en: "pc" },
        type: MeasureUnitType.COUNT,
        factor: null,
        allowsDecimals: false,
        isProductUnit: true,
    },
    [MeasureUnit.BOX]: {
        name: { hy: "Տուփ", en: "Box" },
        shortName: { hy: "տուփ", en: "box" },
        type: MeasureUnitType.COUNT,
        factor: null,
        allowsDecimals: false,
        isProductUnit: true,
    },
    [MeasureUnit.BUNCH]: {
        name: { hy: "Կապ", en: "Bunch" },
        shortName: { hy: "կապ", en: "bunch" },
        type: MeasureUnitType.COUNT,
        factor: null,
        allowsDecimals: false,
        isProductUnit: true,
    },
    [MeasureUnit.KILOGRAM]: {
        name: { hy: "Կիլոգրամ", en: "Kilogram" },
        shortName: { hy: "կգ", en: "kg" },
        type: MeasureUnitType.WEIGHT,
        factor: 1,
        allowsDecimals: true,
        isProductUnit: true,
    },
    [MeasureUnit.GRAM]: {
        name: { hy: "Գրամ", en: "Gram" },
        shortName: { hy: "գ", en: "g" },
        type: MeasureUnitType.WEIGHT,
        factor: 0.001,
        allowsDecimals: true,
        isProductUnit: true,
    },
    [MeasureUnit.LITER]: {
        name: { hy: "Լիտր", en: "Liter" },
        shortName: { hy: "լ", en: "l" },
        type: MeasureUnitType.VOLUME,
        factor: 1,
        allowsDecimals: true,
        isProductUnit: true,
    },
    [MeasureUnit.MILLILITER]: {
        name: { hy: "Միլիլիտր", en: "Milliliter" },
        shortName: { hy: "մլ", en: "ml" },
        type: MeasureUnitType.VOLUME,
        factor: 0.001,
        allowsDecimals: true,
        isProductUnit: true,
    },
    [MeasureUnit.MILLIGRAM]: {
        name: { hy: "Միլիգրամ", en: "Milligram" },
        shortName: { hy: "մգ", en: "mg" },
        type: MeasureUnitType.WEIGHT,
        factor: 0.000001,
        allowsDecimals: true,
        isProductUnit: false,
    },
};

/** Units a product can be counted in, in list order. */
export const PRODUCT_MEASURE_UNITS: readonly MeasureUnit[] = (Object.keys(MEASURE_UNITS).map(Number) as MeasureUnit[])
    .filter((unit) => MEASURE_UNITS[unit].isProductUnit);
