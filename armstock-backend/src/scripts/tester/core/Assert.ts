/**
 * Expectations are written in the case and derived from what was sent - there are no
 * recorded snapshots, so a test can never be "refreshed" into passing.
 */
export class AssertionError extends Error {
    constructor(message: string, readonly expected?: unknown, readonly actual?: unknown) {
        super(message);
        this.name = "AssertionError";
    }
}

/** Marker inside an expected object for a value that only has to match a shape. */
interface IMatcher {
    __matcher: true;
    describe: string;
    test: (value: unknown) => boolean;
}

const matcher = (describe: string, test: (value: unknown) => boolean): IMatcher => ({ __matcher: true, describe, test });

const isMatcher = (value: unknown): value is IMatcher =>
    typeof value === "object" && value !== null && "__matcher" in value;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const anyUuid = matcher("any uuid", (v) => typeof v === "string" && UUID.test(v));
export const anyString = matcher("any string", (v) => typeof v === "string" && v.length > 0);
export const anyDate = matcher("any date", (v) => typeof v === "string" && !Number.isNaN(Date.parse(v)));
export const isNull = matcher("null", (v) => v === null);

const trailText = (trail: string[]) => (trail.length ? trail.join(".") : "value");

/** Compares only the fields named in `expected`; extra fields on `actual` are ignored. */
const compare = (actual: unknown, expected: unknown, trail: string[]): void => {
    if (isMatcher(expected)) {
        if (!expected.test(actual)) throw new AssertionError(`${trailText(trail)} is not ${expected.describe}`, expected.describe, actual);
        return;
    }
    if (expected === null || typeof expected !== "object") {
        if (actual !== expected) throw new AssertionError(`${trailText(trail)} does not match`, expected, actual);
        return;
    }
    if (Array.isArray(expected)) {
        if (!Array.isArray(actual)) throw new AssertionError(`${trailText(trail)} is not an array`, expected, actual);
        if (actual.length !== expected.length) {
            throw new AssertionError(`${trailText(trail)} has ${actual.length} items, expected ${expected.length}`, expected, actual);
        }
        expected.forEach((item, index) => compare(actual[index], item, [...trail, String(index)]));
        return;
    }
    if (typeof actual !== "object" || actual === null) throw new AssertionError(`${trailText(trail)} is not an object`, expected, actual);
    for (const [key, value] of Object.entries(expected)) {
        compare((actual as Record<string, unknown>)[key], value, [...trail, key]);
    }
};

/** The main assertion: the named fields of `actual` must match `expected`. */
export const matches = (actual: unknown, expected: unknown, label?: string): void => {
    try {
        compare(actual, expected, []);
    } catch (error) {
        if (error instanceof AssertionError && label) throw new AssertionError(`${label}: ${error.message}`, error.expected, error.actual);
        throw error;
    }
};

export const equals = (actual: unknown, expected: unknown, label = "value"): void => {
    if (actual !== expected) throw new AssertionError(`${label} does not match`, expected, actual);
};

export const isTrue = (value: boolean, label: string): void => {
    if (!value) throw new AssertionError(label, true, value);
};
