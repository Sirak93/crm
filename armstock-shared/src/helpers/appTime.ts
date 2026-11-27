import { APP_TIME_ZONE } from "../constants/LocaleConstants";

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

/** The Armenian wall-clock time as a Date whose UTC fields hold it (seconds precision). */
export const toAppWallClock = (date: Date): Date => {
    const parts = PARTS.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((item) => item.type === type)?.value);
    return new Date(Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second")));
};

/** Back from an Armenian wall-clock time in UTC fields to the real moment. Armenia has no summer time. */
export const fromAppWallClock = (wall: Date): Date => {
    // toAppWallClock drops milliseconds, so they are added back to get the plain offset.
    const offset = toAppWallClock(wall).getTime() + wall.getUTCMilliseconds() - wall.getTime();
    return new Date(wall.getTime() - offset);
};
