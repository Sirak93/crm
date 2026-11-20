import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { seedDevCompany } from "./DevSeeder";

AppDataSource.initialize()
    .then(async () => {
        console.log("DB connected, seeding the dev company...");
        await seedDevCompany();
        process.exit(0);
    })
    .catch((err: unknown) => {
        console.error(err);
        process.exit(1);
    });
