import { In } from "typeorm";
import {
    MEASURE_UNITS,
    type MeasureUnit,
    ProductStatus,
    RECIPE_QUANTITY_DECIMALS,
    STOCK_IN_REASON_NAMES,
    STOCK_OUT_DEPARTMENT_NAMES,
    STOCK_OUT_REASON_NAMES,
    StockDocumentType,
    type IStockBalance,
    type IStockOut,
    type Locale,
    type StockInReason,
    type StockOutReason,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Company } from "../models/Company";
import { ProductCategory } from "../models/ProductCategory";
import { Product } from "../models/Product";
import { StockInLine } from "../models/StockInLine";
import { StockOutLine } from "../models/StockOutLine";
import { Supplier } from "../models/Supplier";
import { User } from "../models/User";
import { EXPORT_FILE_NAME, exportTexts, type ExportTexts } from "../constants/ExportTexts";
import { StockService } from "./StockService";
import { StockInService } from "./StockInService";
import { StockOutService } from "./StockOutService";
import type {
    KitchenBalanceExportQuery,
    ProductMovementExportQuery,
    StockBalanceExportQuery,
    StockMovementExportQuery,
} from "../schemas/StockSchema";
import type { StockInExportQuery } from "../schemas/StockInSchema";
import type { StockOutExportQuery } from "../schemas/StockOutSchema";
import { toAppWallClock } from "../utils/appDate";
import { userName } from "../utils/userName";
import {
    buildExcel,
    DATE_TIME_FORMAT,
    exportFileName,
    filtersLines,
    generatedLine,
    periodLine,
    quantityFormat,
    type ExcelValue,
    type IExcelColumn,
    type IExcelRow,
} from "../utils/excelReport";

interface IDocumentLine {
    name: string;
    measureUnit: MeasureUnit;
    quantity: number;
}

export interface IExportFile {
    fileName: string;
    content: Buffer;
}

/** The stock Excel files: all rows for the page's filters, texts in the user's language. */
export class StockExportService {
    private stockService = new StockService();
    private stockInService = new StockInService();
    private stockOutService = new StockOutService();

    async movement(companyUuid: string, query: StockMovementExportQuery): Promise<IExportFile> {
        const { lang, search, categoryUuid } = query;
        const text = exportTexts(lang);

        const [companyName, categoryName, rows] = await Promise.all([
            this.companyName(companyUuid),
            this.categoryName(companyUuid, categoryUuid),
            this.stockService.movementAll(companyUuid, query),
        ]);

        return {
            fileName: exportFileName([EXPORT_FILE_NAME.STOCK_MOVEMENT], [query.dateFrom, query.dateTo]),
            content: await buildExcel({
                sheetName: text.stockMovement,
                left: [companyName, text.stockMovement, ...StockExportService.productFilters(text, search, categoryName)],
                right: [periodLine(text, query), generatedLine(text)],
                columns: [
                    { title: text.product },
                    { title: text.unit },
                    ...[text.initial, text.in, text.out, text.final].map((title) => ({ title, format: quantityFormat() })),
                ],
                rows: rows.map((row) => [
                    row.status === ProductStatus.ARCHIVED ? `${row.name} (${text.archived})` : row.name,
                    MEASURE_UNITS[row.measureUnit].shortName[lang],
                    row.initial,
                    row.incoming,
                    row.outgoing,
                    row.final,
                ]),
            }),
        };
    }

    async productMovement(companyUuid: string, productUuid: string, query: ProductMovementExportQuery): Promise<IExportFile> {
        const { lang } = query;
        const text = exportTexts(lang);

        const [companyName, { product, documents }] = await Promise.all([
            this.companyName(companyUuid),
            this.stockService.productMovementAll(companyUuid, productUuid, query),
        ]);
        const unit = MEASURE_UNITS[product.measureUnit].shortName[lang];

        return {
            fileName: exportFileName([EXPORT_FILE_NAME.PRODUCT_MOVEMENT, product.name], [query.dateFrom, query.dateTo]),
            content: await buildExcel({
                sheetName: text.productMovement,
                left: [companyName, text.productMovement, `${text.product}: ${product.name} (${unit})`],
                right: [periodLine(text, query), generatedLine(text)],
                columns: [
                    { title: text.date, format: DATE_TIME_FORMAT },
                    { title: text.document },
                    { title: text.reason },
                    ...[text.in, text.out, text.stockAfter].map((title) => ({ title, format: quantityFormat() })),
                ],
                // Initial stock first and a total last, so the four header numbers are in the table too.
                rows: [
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
                boldLastRow: true,
            }),
        };
    }

    async stockIns(companyUuid: string, query: StockInExportQuery): Promise<IExportFile> {
        const { lang, reason, supplierUuid } = query;
        const text = exportTexts(lang);

        const [companyName, supplierName, docs] = await Promise.all([
            this.companyName(companyUuid),
            this.supplierName(companyUuid, supplierUuid),
            this.stockInService.listAll(companyUuid, query),
        ]);
        const lines = await this.documentLines(StockInLine, "stockInUuid", companyUuid, docs.map((doc) => doc.uuid));

        return {
            fileName: exportFileName([EXPORT_FILE_NAME.STOCK_INS], [query.dateFrom, query.dateTo]),
            content: await buildExcel({
                sheetName: text.stockIns,
                left: [companyName, text.stockIns, ...filtersLines(text, [
                    reason ? `${text.reason}: ${STOCK_IN_REASON_NAMES[reason][lang]}` : null,
                    supplierName ? `${text.supplier}: ${supplierName}` : null,
                ])],
                right: [periodLine(text, query), generatedLine(text)],
                columns: StockExportService.documentColumns(text, text.supplier),
                rows: docs.flatMap((doc) => StockExportService.documentRows([
                    doc.number,
                    toAppWallClock(new Date(doc.date)),
                    STOCK_IN_REASON_NAMES[doc.reason][lang],
                    doc.supplier?.name ?? null,
                    doc.createdBy.name,
                ], lines.get(doc.uuid) ?? [], lang)),
            }),
        };
    }

    async stockOuts(companyUuid: string, query: StockOutExportQuery): Promise<IExportFile> {
        const { lang, reason, supplierUuid, receiverUuid } = query;
        const text = exportTexts(lang);

        const [companyName, supplierName, receiverName, docs] = await Promise.all([
            this.companyName(companyUuid),
            this.supplierName(companyUuid, supplierUuid),
            this.receiverName(companyUuid, receiverUuid),
            this.stockOutService.listAll(companyUuid, query),
        ]);
        const lines = await this.documentLines(StockOutLine, "stockOutUuid", companyUuid, docs.map((doc) => doc.uuid));

        return {
            fileName: exportFileName([EXPORT_FILE_NAME.STOCK_OUTS], [query.dateFrom, query.dateTo]),
            content: await buildExcel({
                sheetName: text.stockOuts,
                left: [companyName, text.stockOuts, ...filtersLines(text, [
                    reason ? `${text.reason}: ${STOCK_OUT_REASON_NAMES[reason][lang]}` : null,
                    supplierName ? `${text.supplier}: ${supplierName}` : null,
                    receiverName ? `${text.receiver}: ${receiverName}` : null,
                ])],
                right: [periodLine(text, query), generatedLine(text)],
                columns: StockExportService.documentColumns(text, text.destination),
                rows: docs.flatMap((doc) => {
                    const reasonName = STOCK_OUT_REASON_NAMES[doc.reason][lang];
                    return StockExportService.documentRows([
                        doc.number,
                        toAppWallClock(new Date(doc.date)),
                        doc.hasRecipes ? `${reasonName} (${text.byRecipe})` : reasonName,
                        StockExportService.destination(doc, lang),
                        doc.createdBy.name,
                    ], lines.get(doc.uuid) ?? [], lang);
                }),
            }),
        };
    }

    async stockBalance(companyUuid: string, query: StockBalanceExportQuery): Promise<IExportFile> {
        const { lang, search, categoryUuid } = query;
        const text = exportTexts(lang);

        const [companyName, categoryName, rows] = await Promise.all([
            this.companyName(companyUuid),
            this.categoryName(companyUuid, categoryUuid),
            this.stockService.balanceAll(companyUuid, query, query.inStockOnly),
        ]);

        return {
            fileName: exportFileName([EXPORT_FILE_NAME.STOCK_BALANCE], [new Date().toISOString()]),
            content: await buildExcel({
                sheetName: text.stockBalance,
                left: [companyName, text.stockBalance, ...StockExportService.productFilters(text, search, categoryName)],
                right: [generatedLine(text)],
                columns: [
                    { title: text.product },
                    { title: text.code },
                    { title: text.category },
                    { title: text.unit },
                    { title: text.quantity, format: quantityFormat() },
                ],
                rows: rows.map((row) => [
                    StockExportService.balanceName(row, text),
                    row.code,
                    row.categoryName,
                    MEASURE_UNITS[row.measureUnit].shortName[lang],
                    row.quantity,
                ]),
            }),
        };
    }

    async kitchenBalance(companyUuid: string, query: KitchenBalanceExportQuery): Promise<IExportFile> {
        const { lang, search, categoryUuid } = query;
        const text = exportTexts(lang);

        const [companyName, categoryName, rows] = await Promise.all([
            this.companyName(companyUuid),
            this.categoryName(companyUuid, categoryUuid),
            this.stockService.kitchenBalanceAll(companyUuid, query),
        ]);

        return {
            fileName: exportFileName([EXPORT_FILE_NAME.KITCHEN_BALANCE], [new Date().toISOString()]),
            content: await buildExcel({
                sheetName: text.kitchenBalance,
                left: [companyName, text.kitchenBalance, ...StockExportService.productFilters(text, search, categoryName)],
                right: [generatedLine(text)],
                columns: [
                    { title: text.product },
                    { title: text.category },
                    { title: text.unit },
                    // Recipe needs have 6 decimals, so the kitchen balance does too.
                    { title: text.quantity, format: quantityFormat(RECIPE_QUANTITY_DECIMALS) },
                ],
                rows: rows.map((row) => [
                    StockExportService.balanceName(row, text),
                    row.categoryName,
                    MEASURE_UNITS[row.measureUnit].shortName[lang],
                    row.quantity,
                ]),
            }),
        };
    }

    /** Stock-in and stock-out lists: the same columns, only the party column differs. */
    private static documentColumns(text: ExportTexts, partyTitle: string): IExcelColumn[] {
        return [
            { title: text.number },
            { title: text.date, format: DATE_TIME_FORMAT },
            { title: text.reason },
            { title: partyTitle },
            { title: text.createdBy },
            { title: text.product },
            { title: text.unit },
            { title: text.quantity, format: quantityFormat() },
        ];
    }

    /** A bold document row, then its product lines nested under it (Excel's +/- closes them). */
    private static documentRows(header: ExcelValue[], lines: IDocumentLine[], lang: Locale): IExcelRow[] {
        const empty = header.map(() => null);
        return [
            { values: header, bold: true },
            ...lines.map((line): IExcelRow => ({
                values: [...empty, line.name, MEASURE_UNITS[line.measureUnit].shortName[lang], line.quantity],
                level: 1,
            })),
        ];
    }

    /** The product lines of these documents, in the order typed, by bounded lookups instead of joins. */
    private async documentLines(
        entity: typeof StockInLine | typeof StockOutLine,
        documentColumn: "stockInUuid" | "stockOutUuid",
        companyUuid: string,
        documentUuids: string[],
    ): Promise<Map<string, IDocumentLine[]>> {
        const map = new Map<string, IDocumentLine[]>();
        if (!documentUuids.length) return map;

        const rows = await AppDataSource.getRepository(entity)
            .createQueryBuilder("line")
            .select(`line.${documentColumn}`, "documentUuid")
            .addSelect("line.productUuid", "productUuid")
            .addSelect("line.quantity", "quantity")
            .where("line.companyUuid = :companyUuid", { companyUuid })
            .andWhere(`line.${documentColumn} IN (:...documentUuids)`, { documentUuids })
            .orderBy("line.position", "ASC")
            .getRawMany<{ documentUuid: string; productUuid: string; quantity: string }>();
        const productUuids = [...new Set(rows.map((row) => row.productUuid))];
        const products = productUuids.length
            ? await AppDataSource.getRepository(Product).find({ where: { uuid: In(productUuids), companyUuid } })
            : [];
        const productMap = new Map(products.map((product) => [product.uuid, product]));

        for (const row of rows) {
            const product = productMap.get(row.productUuid)!;
            const list = map.get(row.documentUuid) ?? [];
            list.push({ name: product.name, measureUnit: product.measureUnit, quantity: Number(row.quantity) });
            map.set(row.documentUuid, list);
        }
        return map;
    }

    /** The supplier for a return, the department (and receiver) for an issue; empty for a loss. */
    private static destination(doc: IStockOut, lang: Locale): string | null {
        if (doc.supplier) return doc.supplier.name;
        if (!doc.department) return null;
        const department = STOCK_OUT_DEPARTMENT_NAMES[doc.department][lang];
        return doc.receiver ? `${department} · ${doc.receiver.name}` : department;
    }

    private static productFilters(text: ExportTexts, search: string | undefined, categoryName: string | null): string[] {
        return filtersLines(text, [
            search ? `${text.search}: ${search}` : null,
            categoryName ? `${text.category}: ${categoryName}` : null,
        ]);
    }

    private static balanceName(row: IStockBalance, text: ExportTexts): string {
        return row.status === ProductStatus.ARCHIVED ? `${row.name} (${text.archived})` : row.name;
    }

    private async companyName(companyUuid: string): Promise<string> {
        const company = await AppDataSource.getRepository(Company).findOneByOrFail({ uuid: companyUuid });
        return company.name;
    }

    private async categoryName(companyUuid: string, uuid: string | undefined): Promise<string | null> {
        if (!uuid) return null;
        const category = await AppDataSource.getRepository(ProductCategory).findOneBy({ uuid, companyUuid });
        return category?.name ?? null;
    }

    private async supplierName(companyUuid: string, uuid: string | undefined): Promise<string | null> {
        if (!uuid) return null;
        const supplier = await AppDataSource.getRepository(Supplier).findOneBy({ uuid, companyUuid });
        return supplier?.name ?? null;
    }

    private async receiverName(companyUuid: string, uuid: string | undefined): Promise<string | null> {
        if (!uuid) return null;
        const user = await AppDataSource.getRepository(User).findOneBy({ uuid, companyUuid });
        return user ? userName(user) : null;
    }
}
