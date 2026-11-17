/** Stops startup with one clear message listing every missing variable. */
export function requireEnv(...names: string[]): void {
    const missing = names.filter((name) => !process.env[name]);
    if (missing.length > 0) {
        throw new Error(`${missing.join(", ")} is not set`);
    }
}
