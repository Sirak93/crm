export const ErrorCodes = {
    SERVER: {
        INTERNAL_ERROR: {
            CODE: "SERVER_INTERNAL_ERROR",
            STATUS: 500,
        },
    },
    VALIDATION: {
        GLOBAL: {
            CODE: "VALIDATION_ERROR",
            STATUS: 422,
        },
    },
    AUTH: {
        INVALID_CREDENTIALS: {
            CODE: "AUTH_INVALID_CREDENTIALS",
            STATUS: 422,
        },
        UNAUTHORIZED: {
            CODE: "AUTH_UNAUTHORIZED",
            STATUS: 401,
        },
        FORBIDDEN: {
            CODE: "AUTH_FORBIDDEN",
            STATUS: 403,
        },
    },
    USER: {
        BLOCKED: {
            CODE: "USER_BLOCKED",
            STATUS: 423,
        },
        EMAIL_TAKEN: {
            CODE: "USER_EMAIL_TAKEN",
            STATUS: 409,
        },
        NOT_FOUND: {
            CODE: "USER_NOT_FOUND",
            STATUS: 404,
        },
        PASSWORD_REQUIRED: {
            CODE: "USER_PASSWORD_REQUIRED",
            STATUS: 422,
        },
        OWN_ACCOUNT: {
            CODE: "USER_OWN_ACCOUNT",
            STATUS: 403,
        },
    },
    COMPANY: {
        NOT_FOUND: {
            CODE: "COMPANY_NOT_FOUND",
            STATUS: 404,
        },
        // Same status as USER.BLOCKED: the frontend ends the session on it.
        BLOCKED: {
            CODE: "COMPANY_BLOCKED",
            STATUS: 423,
        },
    },
    MEASURE_UNIT: {
        NOT_FOUND: {
            CODE: "MEASURE_UNIT_NOT_FOUND",
            STATUS: 404,
        },
        NAME_TAKEN: {
            CODE: "MEASURE_UNIT_NAME_TAKEN",
            STATUS: 409,
        },
        IN_USE: {
            CODE: "MEASURE_UNIT_IN_USE",
            STATUS: 409,
        },
    },
    PRODUCT_CATEGORY: {
        NOT_FOUND: {
            CODE: "PRODUCT_CATEGORY_NOT_FOUND",
            STATUS: 404,
        },
        NAME_TAKEN: {
            CODE: "PRODUCT_CATEGORY_NAME_TAKEN",
            STATUS: 409,
        },
        IN_USE: {
            CODE: "PRODUCT_CATEGORY_IN_USE",
            STATUS: 409,
        },
    },
    PRODUCT: {
        NOT_FOUND: {
            CODE: "PRODUCT_NOT_FOUND",
            STATUS: 404,
        },
        CODE_TAKEN: {
            CODE: "PRODUCT_CODE_TAKEN",
            STATUS: 409,
        },
    },
    SUPPLIER: {
        NOT_FOUND: {
            CODE: "SUPPLIER_NOT_FOUND",
            STATUS: 404,
        },
        NAME_TAKEN: {
            CODE: "SUPPLIER_NAME_TAKEN",
            STATUS: 409,
        },
    },
    RATE_LIMIT: {
        TOO_MANY_REQUESTS: {
            CODE: "RATE_LIMIT_TOO_MANY_REQUESTS",
            STATUS: 429,
        },
    },
} as const;
