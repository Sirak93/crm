// Loaded here too so a script that imports this file directly still gets DB_* from .env.
import "dotenv/config";
import { DataSource } from "typeorm";
import * as path from "path";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [path.join(__dirname, "../models/**/*.{ts,js}")],
    // Only the exact string "true" turns it on, so no environment re-derives the schema by accident.
    synchronize: process.env.DB_SYNCHRONIZE === "true",
    logging: false,
});
