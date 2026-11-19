import type { ValueTransformer } from "typeorm";

/** Postgres returns numeric columns as strings; read them back as numbers. */
export const numericTransformer: ValueTransformer = {
    to: (value: number) => value,
    from: (value: string | null) => (value === null ? null : Number(value)),
};
