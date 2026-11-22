import {
    MONEY_DECIMALS,
    StockInReason,
    StockOutDepartment,
    StockOutReason,
    type IMeasureUnit,
    type IProduct,
    type IProductCategory,
    type IStockInDetails,
    type IStockOutDetails,
    type ISupplier,
} from "armstock-shared";
import { PATHS } from "./Paths";
import { uniqueName } from "./Random";
import type { ITestUser } from "../interfaces/ITestUser";

/**
 * One call per thing a case needs, with sensible defaults; any field can be overridden.
 * The `actor` must have the permission to create it. Body builders are exported too, so a
 * case can send a slightly wrong body without repeating the defaults.
 */

const MONEY_SCALE = 10 ** MONEY_DECIMALS;
const DEFAULT_PRICE = 100;

/** A company's default unit: pieces (no decimals) or one that allows decimals. */
export const findUnit = async (actor: ITestUser, allowsDecimals: boolean): Promise<IMeasureUnit> => {
    const { data } = await actor.api.ok<IMeasureUnit[]>("GET", PATHS.MEASURE_UNITS);
    const unit = data.find((u) => u.allowsDecimals === allowsDecimals);
    if (!unit) throw new Error(`no measure unit with allowsDecimals=${allowsDecimals}`);
    return unit;
};

export const findCategory = async (actor: ITestUser): Promise<IProductCategory> => {
    const { data } = await actor.api.ok<IProductCategory[]>("GET", PATHS.PRODUCT_CATEGORIES);
    if (!data[0]) throw new Error("the company has no product category");
    return data[0];
};

interface IProductOptions {
    allowsDecimals?: boolean;
    body?: Record<string, unknown>;
}

export const createProduct = async (actor: ITestUser, { allowsDecimals = false, body = {} }: IProductOptions = {}): Promise<IProduct> => {
    const [unit, category] = await Promise.all([findUnit(actor, allowsDecimals), findCategory(actor)]);
    const { data } = await actor.api.ok<IProduct>("POST", PATHS.PRODUCTS, {
        name: uniqueName("Product"),
        categoryUuid: category.uuid,
        measureUnitUuid: unit.uuid,
        ...body,
    });
    return data;
};

export const createSupplier = async (actor: ITestUser, body: Record<string, unknown> = {}): Promise<ISupplier> => {
    const { data } = await actor.api.ok<ISupplier>("POST", PATHS.SUPPLIERS, { name: uniqueName("Supplier"), ...body });
    return data;
};

export interface ILineInput {
    productUuid: string;
    quantity: number;
    price?: number;
}

const roundMoney = (value: number) => Math.round(value * MONEY_SCALE) / MONEY_SCALE;

/** A stock-in body - a purchase when a supplier is given, otherwise initial stock. */
export const stockInBody = (lines: ILineInput[], fields: Record<string, unknown> = {}) => ({
    reason: fields.supplierUuid ? StockInReason.PURCHASE : StockInReason.INITIAL_STOCK,
    date: new Date().toISOString(),
    lines: lines.map(({ productUuid, quantity, price = DEFAULT_PRICE }) => ({
        productUuid,
        quantity,
        price,
        total: roundMoney(quantity * price),
    })),
    ...fields,
});

export const createStockIn = async (actor: ITestUser, lines: ILineInput[], fields: Record<string, unknown> = {}): Promise<IStockInDetails> => {
    const { data } = await actor.api.ok<IStockInDetails>("POST", PATHS.STOCK_INS, stockInBody(lines, fields));
    return data;
};

/** A stock-out body - an issue to the kitchen unless `fields` say otherwise. */
export const stockOutBody = (lines: ILineInput[], fields: Record<string, unknown> = {}) => ({
    reason: StockOutReason.ISSUED,
    department: StockOutDepartment.KITCHEN,
    date: new Date().toISOString(),
    lines: lines.map(({ productUuid, quantity }) => ({ productUuid, quantity })),
    ...fields,
});

export const createStockOut = async (actor: ITestUser, lines: ILineInput[], fields: Record<string, unknown> = {}): Promise<IStockOutDetails> => {
    const { data } = await actor.api.ok<IStockOutDetails>("POST", PATHS.STOCK_OUTS, stockOutBody(lines, fields));
    return data;
};
