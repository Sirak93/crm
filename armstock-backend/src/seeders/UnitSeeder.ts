import { AppDataSource } from "../config/database";
import { Unit } from "../models/Unit";

const DEFAULT_UNITS = [
    { name: "Piece", shortName: "pcs", allowsDecimals: false },
    { name: "Kilogram", shortName: "kg", allowsDecimals: true },
    { name: "Liter", shortName: "l", allowsDecimals: true },
    { name: "Meter", shortName: "m", allowsDecimals: true },
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
