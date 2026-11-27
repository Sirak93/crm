import { Workbook, type Worksheet } from "exceljs";
import {
    MEASURE_UNITS,
    ProductStatus,
    QUANTITY_DECIMALS,
    STOCK_IN_REASON_NAMES,
    STOCK_OUT_REASON_NAMES,
    StockDocumentType,
    type Locale,
    type StockInReason,
    type StockOutReason,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Company } from "../models/Company";
import { ProductCategory } from "../models/ProductCategory";
import { EXPORT_FILE_NAME, EXPORT_TEXTS } from "../constants/ExportTexts";
import { StockService } from "./StockService";
import type { ProductMovementExportQuery, StockMovementExportQuery } from "../schemas/StockSchema";
import { appIsoDay, formatAppDate, formatAppDateTime, toAppWallClock } from "../utils/appDate";

const QUANTITY_FORMAT = `#,##0.${"0".repeat(QUANTITY_DECIMALS)}`;
// Only to measure column widths: the same digits Excel shows with QUANTITY_FORMAT.
const QUANTITY_TEXT = new Intl.NumberFormat("en-US", { minimumFractionDigits: QUANTITY_DECIMALS, maximumFractionDigits: QUANTITY_DECIMALS });
const DATE_TIME_FORMAT = "dd/mm/yyyy hh:mm";
const HEADER_FILL = "FFF1F3F5";
// Rows 1-5 hold the report header, row 6 is empty.
const TABLE_HEADER_ROW = 7;
const COLUMN_WIDTH = { MIN: 10, MAX: 60, PADDING: 2 } as const;

type Texts = { [K in keyof typeof EXPORT_TEXTS]: string };

export interface IExportFile {
    fileName: string;
    content: Buffer;
}

/** The stock movement Excel files: all rows for the screen's filters, texts in the user's language. */
export class StockExportService {
    private stockService = new StockService();

    async movement(companyUuid: string, query: StockMovementExportQuery): Promise<IExportFile> {
        const { lang, search, categoryUuid, withoutMovement } = query;
        const text = StockExportService.texts(lang);

        const [companyName, categoryName, rows] = await Promise.all([
            this.companyName(companyUuid),
            categoryUuid ? this.categoryName(companyUuid, categoryUuid) : null,
            this.stockService.movementAll(companyUuid, query),
        ]);

        const filters = [
            search ? `${text.search}: ${search}` : null,
            categoryName ? `${text.category}: ${categoryName}` : null,
            `${text.withoutMovement}: ${withoutMovement ? text.yes : text.no}`,
        ].filter(Boolean).join(" · ");

        const workbook = new Workbook();
        const sheet = workbook.addWorksheet(text.stockMovement);
        StockExportService.writeHeader(sheet, [
            companyName,
            text.stockMovement,
            StockExportService.periodText(text, query),
            `${text.generated}: ${formatAppDateTime(new Date())}`,
            `${text.filters}: ${filters}`,
        ]);
        StockExportService.writeTable(
            sheet,
            [text.product, text.unit, text.initial, text.in, text.out, text.final],
            rows.map((row) => [
                row.status === ProductStatus.ARCHIVED ? `${row.name} (${text.archived})` : row.name,
                MEASURE_UNITS[row.measureUnit].shortName[lang],
                row.initial,
                row.incoming,
                row.outgoing,
                row.final,
            ]),
        );

        return {
            fileName: StockExportService.fileName([EXPORT_FILE_NAME.STOCK_MOVEMENT], query),
            content: await StockExportService.toBuffer(workbook),
        };
    }

    async productMovement(companyUuid: string, productUuid: string, query: ProductMovementExportQuery): Promise<IExportFile> {
        const { lang } = query;
        const text = StockExportService.texts(lang);

        const [companyName, { product, documents }] = await Promise.all([
            this.companyName(companyUuid),
            this.stockService.productMovementAll(companyUuid, productUuid, query),
        ]);
        const unit = MEASURE_UNITS[product.measureUnit].shortName[lang];

        const workbook = new Workbook();
        const sheet = workbook.addWorksheet(text.productMovement);
        StockExportService.writeHeader(sheet, [
            companyName,
            text.productMovement,
            `${text.product}: ${product.name} (${unit})`,
            StockExportService.periodText(text, query),
            `${text.generated}: ${formatAppDateTime(new Date())}`,
        ]);
        // Initial stock first and a total last, so the four header numbers are in the table too.
        StockExportService.writeTable(
            sheet,
            [text.date, text.document, text.reason, text.in, text.out, text.stockAfter],
            [
                [null, null, text.initialStock, null, null, product.initial],
                ...documents.map((doc) => {
                    const reason = doc.type === StockDocumentType.STOCK_IN
                        ? STOCK_IN_REASON_NAMES[doc.reason as StockInReason][lang]
                        : STOCK_OUT_REASON_NAMES[doc.reason as StockOutReason][lang];
                    return [
                        toAppWallClock(new Date(doc.date)),
                        doc.number,
                        doc.recipes.length ? `${reason} (${text.byRecipe})` : reason,
                        doc.incoming || null,
                        doc.outgoing || null,
                        doc.stockAfter,
                    ];
                }),
                [null, null, text.total, product.incoming, product.outgoing, product.final],
            ],
        );
        sheet.lastRow!.font = { bold: true };

        return {
            fileName: StockExportService.fileName([EXPORT_FILE_NAME.PRODUCT_MOVEMENT, product.name], query),
            content: await StockExportService.toBuffer(workbook),
        };
    }

    private static texts(lang: Locale): Texts {
        return Object.fromEntries(Object.entries(EXPORT_TEXTS).map(([key, value]) => [key, value[lang]])) as Texts;
    }

    private async companyName(companyUuid: string): Promise<string> {
        const company = await AppDataSource.getRepository(Company).findOneByOrFail({ uuid: companyUuid });
        return company.name;
    }

    private async categoryName(companyUuid: string, uuid: string): Promise<string | null> {
        const category = await AppDataSource.getRepository(ProductCategory).findOneBy({ uuid, companyUuid });
        return category?.name ?? null;
    }

    private static periodText(text: Texts, { dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }): string {
        const from = dateFrom && formatAppDate(new Date(dateFrom));
        const to = dateTo && formatAppDate(new Date(dateTo));
        if (from && to) return `${text.period}: ${from} – ${to}`;
        if (from) return `${text.period}: ${text.from} ${from}`;
        if (to) return `${text.period}: ${text.upTo} ${to}`;
        return `${text.period}: ${text.allTime}`;
    }

    /** e.g. stock-movement_2026-11-01_2026-11-30.xlsx; characters a file name can't have become "-". */
    private static fileName(parts: string[], { dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }): string {
        const days = [dateFrom, dateTo].filter((date): date is string => !!date).map((date) => appIsoDay(new Date(date)));
        return `${[...parts, ...days].join("_").replace(/[\\/:*?"<>|\s]+/g, "-")}.xlsx`;
    }

    private static writeHeader(sheet: Worksheet, lines: string[]): void {
        lines.forEach((line, index) => {
            const row = sheet.getRow(index + 1);
            row.getCell(1).value = line;
            if (index < 2) row.font = { bold: true, size: index === 0 ? 14 : 12 };
        });
    }

    /** Bold header that stays in view on scroll, quantity columns with 3 decimals, widths fitting the content. */
    private static writeTable(sheet: Worksheet, headers: string[], rows: (string | number | Date | null)[][]): void {
        const header = sheet.getRow(TABLE_HEADER_ROW);
        header.values = headers;
        header.font = { bold: true };
        header.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
            cell.border = { bottom: { style: "thin" } };
        });
        sheet.views = [{ state: "frozen", ySplit: TABLE_HEADER_ROW }];

        rows.forEach((values, index) => {
            const row = sheet.getRow(TABLE_HEADER_ROW + 1 + index);
            row.values = values;
            row.eachCell((cell) => {
                if (typeof cell.value === "number") cell.numFmt = QUANTITY_FORMAT;
                if (cell.value instanceof Date) cell.numFmt = DATE_TIME_FORMAT;
            });
        });

        headers.forEach((title, index) => {
            const lengths = [title, ...rows.map((values) => StockExportService.displayText(values[index]))].map((value) => value.length);
            sheet.getColumn(index + 1).width = Math.min(COLUMN_WIDTH.MAX, Math.max(COLUMN_WIDTH.MIN, ...lengths) + COLUMN_WIDTH.PADDING);
        });
    }

    private static displayText(value: string | number | Date | null): string {
        if (value === null) return "";
        if (value instanceof Date) return DATE_TIME_FORMAT;
        if (typeof value === "number") return QUANTITY_TEXT.format(value);
        return value;
    }

    private static async toBuffer(workbook: Workbook): Promise<Buffer> {
        return Buffer.from(await workbook.xlsx.writeBuffer());
    }
}
