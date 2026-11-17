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
    RATE_LIMIT: {
        TOO_MANY_REQUESTS: {
            CODE: "RATE_LIMIT_TOO_MANY_REQUESTS",
            STATUS: 429,
        },
    },
} as const;
