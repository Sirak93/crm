import { AppDataSource } from "../config/database";
import { Unit } from "../models/Unit";

const DEFAULT_UNITS = [
    { name: "Հատ", shortName: "հատ", allowsDecimals: false },
    { name: "Կիլոգրամ", shortName: "կգ", allowsDecimals: true },
    { name: "Լիտր", shortName: "լ", allowsDecimals: true },
    { name: "Մետր", shortName: "մ", allowsDecimals: true },
];

/** Adds the default units that are missing (matched by short name), so it can run again. */
export const seedUnits = async () => {
    const repo = AppDataSource.getRepository(Unit);

    for (const unit of DEFAULT_UNITS) {
        if (await repo.exists({ where: { shortName: unit.shortName } })) {
            console.log(`Unit already exists: ${unit.shortName}`);
            continue;
        }
        await repo.save(repo.create(unit));
        console.log(`Unit created: ${unit.shortName}`);
    }
};
