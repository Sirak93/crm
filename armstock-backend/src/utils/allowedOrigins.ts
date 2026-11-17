/** The browser origins our apps run on (ALLOWED_ORIGINS), used by CORS. */
export const allowedOrigins = (): string[] => process.env.ALLOWED_ORIGINS!.split(",").map((origin) => origin.trim());
