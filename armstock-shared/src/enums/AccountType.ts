export enum AccountType {
    PLATFORM_OWNER = 10,
    /** The one owner of a company - has every permission without storing them. */
    COMPANY_OWNER = 20,
    /** Has a company role and their own permission list. */
    COMPANY_MEMBER = 30,
}
