// Every per-IP rate limit, in one place. Numbers are per window.
export const RateLimits = {
    // POST /api/auth/login. No password-recovery flow yet, so kept a little loose.
    LOGIN: {
        windowMs: 15 * 60 * 1000,
        max: 20,
        message: "Too many auth attempts, please try again later.",
    },
} as const;

export type RateLimitPreset = keyof typeof RateLimits;
