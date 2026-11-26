import {
    MeasureUnit,
    StockInReason,
    StockOutDepartment,
    StockOutReason,
    type IProduct,
    type IProductCategory,
    type IRecipeDetails,
    type IStockInDetails,
    type IStockOutDetails,
    type ISupplier,
    type ISupplierContact,
} from "armstock-shared";
import { PATHS } from "./Paths";
import { uniqueName } from "./Random";
import type { ITestUser } from "../interfaces/ITestUser";

/**
 * One call per thing a case needs, with sensible defaults; any field can be overridden.
 * The `actor` must have the permission to create it. Body builders are exported too, so a
 * case can send a slightly wrong body without repeating the defaults.
 */

/** The unit createProduct picks: pieces (no decimals) or kilograms (decimals). */
export const PIECES_UNIT = MeasureUnit.PIECE;
export const KILOS_UNIT = MeasureUnit.KILOGRAM;

export const findCategory = async (actor: ITestUser): Promise<IProductCategory> => {
    const { data } = await actor.api.ok<IProductCategory[]>("GET", PATHS.PRODUCT_CATEGORIES);
    if (!data[0]) throw new Error("the company has no product category");
    return data[0];
};

export const createCategory = async (actor: ITestUser, body: Record<string, unknown> = {}): Promise<IProductCategory> => {
    const { data } = await actor.api.ok<IProductCategory>("POST", PATHS.PRODUCT_CATEGORIES, { name: uniqueName("Category"), ...body });
    return data;
};

interface IProductOptions {
    allowsDecimals?: boolean;
    body?: Record<string, unknown>;
}

export const createProduct = async (actor: ITestUser, { allowsDecimals = false, body = {} }: IProductOptions = {}): Promise<IProduct> => {
    const category = await findCategory(actor);
    const { data } = await actor.api.ok<IProduct>("POST", PATHS.PRODUCTS, {
        name: uniqueName("Product"),
        categoryUuid: category.uuid,
        measureUnit: allowsDecimals ? KILOS_UNIT : PIECES_UNIT,
        ...body,
    });
    return data;
};

export const createSupplier = async (actor: ITestUser, body: Record<string, unknown> = {}): Promise<ISupplier> => {
    const { data } = await actor.api.ok<ISupplier>("POST", PATHS.SUPPLIERS, { name: uniqueName("Supplier"), ...body });
    return data;
};

export const createContact = async (actor: ITestUser, supplierUuid: string, body: Record<string, unknown> = {}): Promise<ISupplierContact> => {
    const { data } = await actor.api.ok<ISupplierContact>("POST", `${PATHS.SUPPLIERS}/${supplierUuid}/contacts`, { name: uniqueName("Contact"), ...body });
    return data;
};

export interface ILineInput {
    productUuid: string;
    /** The product's unit - stock-in sends it as the pack unit. */
    measureUnit: MeasureUnit;
    quantity: number;
}

/** A line of `quantity` of `product`. */
export const lineOf = (product: Pick<IProduct, "uuid" | "measureUnit">, quantity: number): ILineInput =>
    ({ productUuid: product.uuid, measureUnit: product.measureUnit, quantity });

/** A stock-in body - a purchase when a supplier is given, otherwise initial stock. Each line is one pack of `quantity`. */
export const stockInBody = (lines: ILineInput[], fields: Record<string, unknown> = {}) => ({
    reason: fields.supplierUuid ? StockInReason.PURCHASE : StockInReason.INITIAL_STOCK,
    date: new Date().toISOString(),
    lines: lines.map(({ productUuid, measureUnit, quantity }) => ({ productUuid, packQuantity: quantity, packUnit: measureUnit, packCount: 1 })),
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

/** A recipe body - one line per `lines` entry, amounts per 1 person. */
export const recipeBody = (lines: ILineInput[], fields: Record<string, unknown> = {}) => ({
    name: uniqueName("Recipe"),
    note: null,
    lines: lines.map(({ productUuid, quantity }) => ({ productUuid, quantity })),
    ...fields,
});

export const createRecipe = async (actor: ITestUser, lines: ILineInput[], fields: Record<string, unknown> = {}): Promise<IRecipeDetails> => {
    const { data } = await actor.api.ok<IRecipeDetails>("POST", PATHS.RECIPES, recipeBody(lines, fields));
    return data;
};
