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
        ARCHIVED: {
            CODE: "PRODUCT_ARCHIVED",
            STATUS: 422,
        },
        QUANTITY_NOT_WHOLE: {
            CODE: "PRODUCT_QUANTITY_NOT_WHOLE",
            STATUS: 422,
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
        ARCHIVED: {
            CODE: "SUPPLIER_ARCHIVED",
            STATUS: 422,
        },
        IN_USE: {
            CODE: "SUPPLIER_IN_USE",
            STATUS: 409,
        },
    },
    STOCK_IN: {
        NOT_FOUND: {
            CODE: "STOCK_IN_NOT_FOUND",
            STATUS: 404,
        },
        NOT_CREATOR: {
            CODE: "STOCK_IN_NOT_CREATOR",
            STATUS: 403,
        },
    },
    STOCK_OUT: {
        NOT_FOUND: {
            CODE: "STOCK_OUT_NOT_FOUND",
            STATUS: 404,
        },
        NOT_CREATOR: {
            CODE: "STOCK_OUT_NOT_CREATOR",
            STATUS: 403,
        },
    },
    STOCK: {
        NOT_ENOUGH: {
            CODE: "STOCK_NOT_ENOUGH",
            STATUS: 409,
        },
    },
    SUPPLIER_CONTACT: {
        NOT_FOUND: {
            CODE: "SUPPLIER_CONTACT_NOT_FOUND",
            STATUS: 404,
        },
    },
    RATE_LIMIT: {
        TOO_MANY_REQUESTS: {
            CODE: "RATE_LIMIT_TOO_MANY_REQUESTS",
            STATUS: 429,
        },
    },
} as const;
