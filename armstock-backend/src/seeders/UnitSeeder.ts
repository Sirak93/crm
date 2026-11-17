import { AppDataSource } from "../config/database";
import { Company } from "../models/Company";
import { Unit } from "../models/Unit";
import { UnitService } from "../services/UnitService";

/** New companies get the default units on create; this fills in companies that have none. */
export const seedUnits = async () => {
    const companies = await AppDataSource.getRepository(Company).find({ select: { uuid: true, name: true } });
    const unitRepo = AppDataSource.getRepository(Unit);

    for (const company of companies) {
        if (await unitRepo.exists({ where: { companyUuid: company.uuid } })) continue;
        await AppDataSource.transaction((manager) => UnitService.createDefaults(manager, company.uuid));
        console.log(`Default units added to: ${company.name}`);
    }
};
