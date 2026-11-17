import { z } from "zod";

/**
 * Only normalizes the email - no format check, so a malformed email gets the usual
 * "invalid credentials" answer from the login itself.
 */
export const LoginSchema = z.object({
    email: z.string().trim().toLowerCase(),
    password: z.string(),
});

export const RefreshSchema = z.object({
    refreshToken: z.string().min(1),
});
