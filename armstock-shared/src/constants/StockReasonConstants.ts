import { StockInReason } from "../enums/StockInReason";
import { StockOutReason } from "../enums/StockOutReason";
import type { ILocalizedText } from "../interfaces/ILocalizedText";

export const STOCK_IN_REASON_NAMES: Readonly<Record<StockInReason, ILocalizedText>> = {
    [StockInReason.PURCHASE]: { hy: "Գնում", en: "Purchase" },
    [StockInReason.INITIAL_STOCK]: { hy: "Սկզբնական մնացորդ", en: "Initial stock" },
    [StockInReason.OTHER]: { hy: "Այլ", en: "Other" },
};

export const STOCK_OUT_REASON_NAMES: Readonly<Record<StockOutReason, ILocalizedText>> = {
    [StockOutReason.RETURNED]: { hy: "Վերադարձ", en: "Returned" },
    [StockOutReason.ISSUED]: { hy: "Տրամադրում", en: "Issued" },
    [StockOutReason.DAMAGED]: { hy: "Վնասված", en: "Damaged" },
    [StockOutReason.EXPIRED]: { hy: "Ժամկետանց", en: "Expired" },
    [StockOutReason.OTHER]: { hy: "Այլ", en: "Other" },
};
