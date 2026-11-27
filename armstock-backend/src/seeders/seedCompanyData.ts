/**
 * From the repo root:
 * npm run seed:company-data -w armstock-backend -- <companyUuid> [months]
 * months can be 1–24 and defaults to 6. It only runs with NODE_ENV=development.
 */
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";
import { AppDataSource } from "../config/database";
import { seedCompanyData } from "./CompanyDataSeeder";

const ArgsSchema = z.tuple([z.uuid(), z.coerce.number().int().min(1).max(24).default(6)]);

const args = ArgsSchema.safeParse(process.argv.slice(2));
if (!args.success) {
    console.error("Usage: npm run seed:company-data -- <companyUuid> [months 1-24, default 6]");
    process.exit(1);
}

AppDataSource.initialize()
    .then(async () => {
        console.log("DB connected, filling the company with sample use...");
        await seedCompanyData(...args.data);
        process.exit(0);
    })
    .catch((err: unknown) => {
        console.error(err);
        process.exit(1);
    });
