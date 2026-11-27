import type { ILocalizedText, Locale } from "armstock-shared";

/** Texts of the Excel files; the app's own texts are in the frontend locale files. */
export const EXPORT_TEXTS = {
    stockMovement: { hy: "Ապրանքների շարժ", en: "Stock movement" },
    productMovement: { hy: "Ապրանքի շարժ", en: "Product movement" },
    stockIns: { hy: "Մուտք", en: "Stock in" },
    stockOuts: { hy: "Ելք", en: "Stock out" },
    stockBalance: { hy: "Պահեստի մնացորդ", en: "Stock balance" },
    kitchenBalance: { hy: "Խոհանոցի մնացորդ", en: "Kitchen balance" },
    number: { hy: "Համար", en: "Number" },
    supplier: { hy: "Մատակարար", en: "Supplier" },
    receiver: { hy: "Ստացող", en: "Receiver" },
    destination: { hy: "Ուր", en: "Where to" },
    createdBy: { hy: "Ստեղծող", en: "Created by" },
    code: { hy: "Կոդ", en: "Code" },
    quantity: { hy: "Քանակ", en: "Quantity" },
    product: { hy: "Ապրանք", en: "Product" },
    unit: { hy: "Միավոր", en: "Unit" },
    initial: { hy: "Սկզբնական", en: "Initial" },
    in: { hy: "Մուտք", en: "In" },
    out: { hy: "Ելք", en: "Out" },
    final: { hy: "Վերջնական", en: "Final" },
    date: { hy: "Ամսաթիվ", en: "Date" },
    document: { hy: "Փաստաթուղթ", en: "Document" },
    reason: { hy: "Պատճառ", en: "Reason" },
    stockAfter: { hy: "Մնացորդ", en: "Stock after" },
    byRecipe: { hy: "բաղադրատոմսով", en: "by recipe" },
    initialStock: { hy: "Սկզբնական մնացորդ", en: "Initial stock" },
    total: { hy: "Ընդամենը", en: "Total" },
    archived: { hy: "արխիվացված", en: "archived" },
    period: { hy: "Ժամանակահատված", en: "Period" },
    from: { hy: "Սկսած", en: "From" },
    upTo: { hy: "Մինչև", en: "Up to" },
    allTime: { hy: "Ամբողջ ժամանակահատվածը", en: "All time" },
    generated: { hy: "Ստեղծվել է", en: "Generated" },
    filters: { hy: "Ֆիլտրեր", en: "Filters" },
    search: { hy: "Որոնում", en: "Search" },
    category: { hy: "Կատեգորիա", en: "Category" },
} as const satisfies Record<string, ILocalizedText>;

export type ExportTexts = { [K in keyof typeof EXPORT_TEXTS]: string };

/** All file texts in one language. */
export const exportTexts = (lang: Locale): ExportTexts =>
    Object.fromEntries(Object.entries(EXPORT_TEXTS).map(([key, value]) => [key, value[lang]])) as ExportTexts;

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const EXPORT_FILE_NAME = {
    STOCK_MOVEMENT: "stock-movement",
    PRODUCT_MOVEMENT: "product-movement",
    STOCK_INS: "stock-in",
    STOCK_OUTS: "stock-out",
    STOCK_BALANCE: "stock-balance",
    KITCHEN_BALANCE: "kitchen-balance",
} as const;
