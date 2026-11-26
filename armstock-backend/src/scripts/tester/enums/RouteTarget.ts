/** What the `:uuid` of a company route points at. */
export enum RouteTarget {
    PRODUCT = 10,
    SUPPLIER = 20,
    /** `:uuid` is the supplier, `:contactUuid` the contact. */
    SUPPLIER_CONTACT = 30,
    PRODUCT_CATEGORY = 50,
    ROLE = 60,
    USER = 70,
    STOCK_IN = 80,
    STOCK_OUT = 90,
    RECIPE = 100,
}
