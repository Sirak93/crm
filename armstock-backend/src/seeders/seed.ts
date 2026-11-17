import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { seedPlatformOwner } from "./PlatformOwnerSeeder";
import { seedUnits } from "./UnitSeeder";

AppDataSource.initialize()
    .then(async () => {
        console.log("DB connected, seeding...");
        await seedPlatformOwner();
        await seedUnits();
        console.log("Seeding complete");
        process.exit(0);
    })
    .catch((err: unknown) => {
        console.error(err);
        process.exit(1);
    });
