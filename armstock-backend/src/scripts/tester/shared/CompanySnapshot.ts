import type { TestDatabase } from "../core/TestDatabase";

// Every table that holds company data, with the filter that picks one company's rows.
const COMPANY_TABLES: Record<string, string> = {
    companies: "uuid = $1",
    users: "company_uuid = $1",
    roles: "company_uuid = $1",
    product_categories: "company_uuid = $1",
    products: "company_uuid = $1",
    suppliers: "company_uuid = $1",
    supplier_contacts: "supplier_uuid IN (SELECT uuid FROM suppliers WHERE company_uuid = $1)",
    stock_ins: "company_uuid = $1",
    stock_in_lines: "company_uuid = $1",
    stock_outs: "company_uuid = $1",
    stock_out_lines: "company_uuid = $1",
    recipes: "company_uuid = $1",
    recipe_lines: "company_uuid = $1",
};

/** A fingerprint of everything one company has - equal before and after means nothing changed. */
export const companySnapshot = async (db: TestDatabase, companyUuid: string): Promise<Record<string, string>> => {
    const entries = await Promise.all(Object.entries(COMPANY_TABLES).map(async ([table, where]) => {
        const [row] = await db.query<{ hash: string }>(
            `SELECT md5(COALESCE(string_agg(t::text, '|' ORDER BY t.uuid), '')) AS hash FROM "${table}" t WHERE ${where}`,
            [companyUuid],
        );
        return [table, row.hash] as const;
    }));
    return Object.fromEntries(entries);
};
