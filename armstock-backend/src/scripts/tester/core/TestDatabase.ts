import "reflect-metadata";
import * as path from "path";
import { DataSource } from "typeorm";

const SRC = path.join(__dirname, "..", "..", "..");

const connection = () => ({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

/** CREATE/DROP DATABASE can't run on a connection to that database, so they go through `postgres`. */
const onMaintenanceDatabase = async (work: (source: DataSource) => Promise<void>): Promise<void> => {
    const admin = new DataSource({ type: "postgres", ...connection(), database: "postgres", logging: false });
    await admin.initialize();
    try {
        await work(admin);
    } finally {
        await admin.destroy();
    }
};

/**
 * The scratch database a side owns end to end: created, built from the entities with
 * `synchronize` (MVP - no migrations yet), queried for checks, and dropped at the end.
 */
export class TestDatabase {
    private dataSource: DataSource | null = null;

    constructor(readonly name: string) {}

    async create(): Promise<void> {
        await onMaintenanceDatabase(async (admin) => {
            await admin.query(`DROP DATABASE IF EXISTS "${this.name}" WITH (FORCE)`);
            await admin.query(`CREATE DATABASE "${this.name}"`);
        });
    }

    async buildSchema(): Promise<void> {
        this.dataSource = new DataSource({
            type: "postgres",
            ...connection(),
            database: this.name,
            entities: [path.join(SRC, "models", "**", "*.{ts,js}")],
            synchronize: true,
            logging: false,
        });
        await this.dataSource.initialize();
    }

    async count(table: string, where?: string, params: unknown[] = []): Promise<number> {
        const [row] = await this.query<{ count: number }>(
            `SELECT count(*)::int AS count FROM "${table}"${where ? ` WHERE ${where}` : ""}`,
            params,
        );
        return row.count;
    }

    query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
        if (!this.dataSource) throw new Error("TestDatabase.buildSchema() must run before querying");
        return this.dataSource.query(sql, params);
    }

    async close(): Promise<void> {
        if (this.dataSource?.isInitialized) await this.dataSource.destroy();
        this.dataSource = null;
    }

    async drop(): Promise<void> {
        await this.close();
        await onMaintenanceDatabase(async (admin) => {
            await admin.query(`DROP DATABASE IF EXISTS "${this.name}" WITH (FORCE)`);
        });
    }
}
