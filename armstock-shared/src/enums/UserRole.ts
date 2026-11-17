export enum UserRole {
    PLATFORM_OWNER = 10,
    COMPANY_OWNER = 20,
    STOREKEEPER = 30,
    ACCOUNTANT = 40,
    /** A company person with no access (e.g. a Chef) - never has a password. */
    STAFF = 50,
}
