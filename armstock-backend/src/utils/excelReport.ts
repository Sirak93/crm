import { Workbook, type Worksheet } from "exceljs";
import { ErrorCodes, QUANTITY_DECIMALS } from "armstock-shared";
import { EXPORT_MAX_ROWS, type ExportTexts } from "../constants/ExportTexts";
import { AppError } from "./AppError";
import { appIsoDay, formatAppDate, formatAppDateTime } from "./appDate";

export type ExcelValue = string | number | Date | null;

/** A row with extras; a plain array is a normal row. */
export interface IExcelRow {
    values: ExcelValue[];
    bold?: boolean;
    /** 1 = nested under the row above it, indented, with Excel's +/- to close the group. */
    level?: 1;
    /** Number format for this row instead of the column's (recipe amounts have 6 decimals). */
    format?: string;
}

export interface IExcelColumn {
    title: string;
    /** Excel number format for this column's numbers or dates. */
    format?: string;
}

/** One sheet: a header block, then a table. */
export interface IExcelReport {
    sheetName: string;
    /** From column A: company, report name, then optional lines (product, filters). */
    left: string[];
    /** Right-aligned in the last column: period, generated time. */
    right: string[];
    columns: IExcelColumn[];
    rows: (ExcelValue[] | IExcelRow)[];
    /** A totals row at the end. */
    boldLastRow?: boolean;
}

/** Always 3 decimals; up to `maxDecimals` only when the amount has them (0.300, but 0.000125). */
export const quantityFormat = (maxDecimals = QUANTITY_DECIMALS): string =>
    `#,##0.${"0".repeat(QUANTITY_DECIMALS)}${"#".repeat(maxDecimals - QUANTITY_DECIMALS)}`;
export const DATE_TIME_FORMAT = "dd/mm/yyyy hh:mm";

const HEADER_FILL = "FFF1F3F5";
const COLUMN_WIDTH = { MIN: 10, MAX: 60, PADDING: 2 } as const;

/** Called with the row count before anything is loaded. */
export const assertExportRows = (count: number): void => {
    if (count > EXPORT_MAX_ROWS) {
        throw new AppError(ErrorCodes.EXPORT.TOO_MANY_ROWS, undefined, undefined, { count }, { max: EXPORT_MAX_ROWS });
    }
};

export const generatedLine = (text: ExportTexts): string => `${text.generated}: ${formatAppDateTime(new Date())}`;

export const periodLine = (text: ExportTexts, { dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }): string => {
    const from = dateFrom && formatAppDate(new Date(dateFrom));
    const to = dateTo && formatAppDate(new Date(dateTo));
    if (from && to) return `${text.period}: ${from} – ${to}`;
    if (from) return `${text.period}: ${text.from} ${from}`;
    if (to) return `${text.period}: ${text.upTo} ${to}`;
    return `${text.period}: ${text.allTime}`;
};

/** "Filters: Reason: Purchase · Supplier: X", or nothing when no filter is set. */
export const filtersLines = (text: ExportTexts, filters: (string | null)[]): string[] => {
    const set = filters.filter((filter): filter is string => !!filter);
    return set.length ? [`${text.filters}: ${set.join(" · ")}`] : [];
};

/** e.g. stock-movement_2026-11-01_2026-11-30.xlsx; characters a file name can't have become "-". */
export const exportFileName = (parts: string[], dates: (string | undefined)[]): string => {
    const days = dates.filter((date): date is string => !!date).map((date) => appIsoDay(new Date(date)));
    return `${[...parts, ...days].join("_").replace(/[\\/:*?"<>|\s]+/g, "-")}.xlsx`;
};

/** The .xlsx bytes: bold header row that stays in view on scroll, column formats, widths fitting the content. */
export const buildExcel = async (report: IExcelReport): Promise<Buffer> => {
    const workbook = new Workbook();
    // The +/- of a group sits on its document row, above the nested rows.
    const sheet = workbook.addWorksheet(report.sheetName, { properties: { outlineProperties: { summaryBelow: false, summaryRight: false } } });
    const rows: IExcelRow[] = report.rows.map((row) => (Array.isArray(row) ? { values: row } : row));
    const headerRow = writeHeader(sheet, report.left, report.right, report.columns.length);

    const header = sheet.getRow(headerRow);
    header.values = report.columns.map((column) => column.title);
    header.font = { bold: true };
    header.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
        cell.border = { bottom: { style: "thin" } };
    });
    sheet.views = [{ state: "frozen", ySplit: headerRow }];

    rows.forEach(({ values, bold, level, format: rowFormat }, index) => {
        const row = sheet.getRow(headerRow + 1 + index);
        row.values = values;
        if (bold) row.font = { bold: true };
        if (level) row.outlineLevel = level;
        row.eachCell((cell, column) => {
            const format = rowFormat ?? report.columns[column - 1].format;
            if (format && (typeof cell.value === "number" || cell.value instanceof Date)) cell.numFmt = format;
            if (level && typeof cell.value === "string") cell.alignment = { indent: 1 };
        });
    });
    if (report.boldLastRow && rows.length) sheet.lastRow!.font = { bold: true };

    const lastColumn = report.columns.length - 1;
    report.columns.forEach((column, index) => {
        // The last column also holds the right-side header (period, generated), so it must fit too.
        const texts = [column.title, ...rows.map((row) => displayText(row.values[index] ?? null, row.format ?? column.format))];
        const lengths = [...texts, ...(index === lastColumn ? report.right : [])].map((text) => text.length);
        sheet.getColumn(index + 1).width = Math.min(COLUMN_WIDTH.MAX, Math.max(COLUMN_WIDTH.MIN, ...lengths) + COLUMN_WIDTH.PADDING);
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
};

/** `left` from column A, `right` right-aligned in the last column; returns the table's header row. */
const writeHeader = (sheet: Worksheet, left: string[], right: string[], columnCount: number): number => {
    left.forEach((line, index) => {
        const cell = sheet.getCell(index + 1, 1);
        cell.value = line;
        if (index < 2) cell.font = { bold: true, size: index === 0 ? 14 : 12 };
    });
    right.forEach((line, index) => {
        const cell = sheet.getCell(index + 1, columnCount);
        cell.value = line;
        cell.alignment = { horizontal: "right" };
    });
    // One empty row between the header block and the table.
    return Math.max(left.length, right.length) + 2;
};

/** Roughly what Excel shows - only to measure column widths. */
const displayText = (value: ExcelValue, format?: string): string => {
    if (value === null) return "";
    if (value instanceof Date) return format ?? "";
    if (typeof value === "number") {
        const decimals = format?.split(".")[1]?.length ?? 0;
        return new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
    }
    return value;
};
