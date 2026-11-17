/**
 * Field names whose values must never be logged. Add a name here when a new
 * schema field carries a secret.
 */
const SECRET_KEYS = new Set([
    "password", "oldPassword", "newPassword", "confirmPassword", "currentPassword",
    "token", "accessToken", "refreshToken",
    "secret",
]);

export const REDACTED = "[REDACTED]";

/** A copy of `value` with every secret field masked, at any depth. The original is untouched. */
export const redactSecrets = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(redactSecrets);
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, field]) =>
        [key, SECRET_KEYS.has(key) ? REDACTED : redactSecrets(field)],
    ));
};
