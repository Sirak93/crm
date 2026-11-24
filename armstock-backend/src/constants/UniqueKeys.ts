/** Database unique keys a save may hit - each maps to a client error in its service. */
export const UNIQUE_KEYS = {
    SUPPLIER_NAME: "UQ_suppliers_company_name",
    PRODUCT_CATEGORY_NAME: "UQ_product_categories_company_name",
    PRODUCT_CODE: "UQ_products_company_code",
    PRODUCT_BARCODE: "UQ_products_company_barcode",
    MEASURE_UNIT_NAME: "UQ_measure_units_company_name",
    MEASURE_UNIT_SHORT_NAME: "UQ_measure_units_company_short_name",
    ROLE_NAME: "UQ_roles_company_name",
    RECIPE_NAME: "UQ_recipes_company_name",
} as const;
