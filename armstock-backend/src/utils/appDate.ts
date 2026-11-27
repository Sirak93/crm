import { toAppWallClock } from "armstock-shared";

const pad = (value: number): string => String(value).padStart(2, "0");

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

/** The year in Armenian time - document numbers count per year. */
export const appYear = (date: Date): number => toAppWallClock(date).getUTCFullYear();
