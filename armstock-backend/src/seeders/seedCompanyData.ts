/**
 * From the repo root:
 * npm run seed:company-data -w armstock-backend -- [companyUuid] [months]
 * Without a uuid it fills the oldest company. months can be 1–24 and defaults to 24.
 * It only runs with NODE_ENV=development.
 */
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";
import { AppDataSource } from "../config/database";
import { Company } from "../models/Company";
import { seedCompanyData } from "./CompanyDataSeeder";

const ArgsSchema = z.tuple([z.uuid().optional(), z.coerce.number().int().min(1).max(24).default(24)]);

const args = ArgsSchema.safeParse(process.argv.slice(2));
if (!args.success) {
    console.error("Usage: npm run seed:company-data -- [companyUuid, default oldest company] [months 1-24, default 24]");
    process.exit(1);
}

const findCompanyUuid = async (uuid: string | undefined): Promise<string> => {
    if (uuid) return uuid;
    const [company] = await AppDataSource.getRepository(Company).find({ order: { createdAt: "ASC" }, take: 1 });
    if (!company) throw new Error("No company found - create one first or pass a company uuid");
    console.log(`No uuid given, using the oldest company: ${company.name} (${company.uuid})`);
    return company.uuid;
};

AppDataSource.initialize()
    .then(async () => {
        const [uuid, months] = args.data;
        const companyUuid = await findCompanyUuid(uuid);
        console.log(`DB connected, filling the company with ${months} months of sample use...`);
        await seedCompanyData(companyUuid, months);
        process.exit(0);
    })
    .catch((err: unknown) => {
        console.error(err);
        process.exit(1);
    });
