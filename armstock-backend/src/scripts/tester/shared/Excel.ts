import { Workbook, type CellValue, type Worksheet } from "exceljs";

/** The first sheet of an .xlsx file. */
export const readSheet = async (content: Buffer): Promise<Worksheet> => {
    const workbook = new Workbook();
    await workbook.xlsx.load(content as unknown as ArrayBuffer);
    return workbook.worksheets[0];
};

/** Every row from `from` on, as plain values; an empty cell is null and a date its ISO text (so `matches` compares it). */
export const rowsOf = (sheet: Worksheet, from = 1): CellValue[][] => {
    const rows: CellValue[][] = [];
    for (let index = from; index <= sheet.rowCount; index++) {
        const row = sheet.getRow(index);
        rows.push(Array.from({ length: sheet.columnCount }, (_, i) => {
            const value = row.getCell(i + 1).value ?? null;
            return value instanceof Date ? value.toISOString() : value;
        }));
    }
    return rows;
};
