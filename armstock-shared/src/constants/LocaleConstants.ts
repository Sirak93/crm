/** App languages; the frontend keeps the choice and sends it where the backend writes texts (Excel). */
export const LOCALE = {
    HY: "hy",
    EN: "en",
} as const;

export type Locale = typeof LOCALE[keyof typeof LOCALE];

/** All dates are shown in Armenian time. */
export const APP_TIME_ZONE = "Asia/Yerevan";
