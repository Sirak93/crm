import { APP_TIME_ZONE } from "armstock-shared";

const PARTS = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

const pad = (value: number): string => String(value).padStart(2, "0");

/** The Armenian wall-clock time stored as UTC - Excel date cells have no time zone. */
export const toAppWallClock = (date: Date): Date => {
    const parts = Object.fromEntries(PARTS.formatToParts(date).map((part) => [part.type, Number(part.value)]));
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
};

/** DD/MM/YYYY in Armenian time, like the app shows dates. */
export const formatAppDate = (date: Date): string => {
    const d = toAppWallClock(date);
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

/** DD/MM/YYYY HH:mm in Armenian time. */
export const formatAppDateTime = (date: Date): string => {
    const d = toAppWallClock(date);
    return `${formatAppDate(date)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/** YYYY-MM-DD in Armenian time - for file names. */
export const appIsoDay = (date: Date): string => toAppWallClock(date).toISOString().slice(0, 10);
