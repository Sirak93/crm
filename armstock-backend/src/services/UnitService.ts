import type { EntityManager } from "typeorm";
import { ErrorCodes, type IUnit } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Unit } from "../models/Unit";
import { AppError } from "../utils/AppError";
import { DEFAULT_UNITS } from "../constants/DefaultUnits";
import type { UnitBody } from "../schemas/UnitSchema";

export class UnitService {
    private repo = AppDataSource.getRepository(Unit);

    private static toUnit(unit: Unit): IUnit {
        return {
            uuid: unit.uuid,
            name: unit.name,
            shortName: unit.shortName,
            allowsDecimals: unit.allowsDecimals,
        };
    }

    /** Runs inside the caller's transaction (company create). */
    static async createDefaults(manager: EntityManager, companyUuid: string): Promise<void> {
        const repo = manager.getRepository(Unit);
        await repo.save(DEFAULT_UNITS.map((unit) => repo.create({ ...unit, companyUuid })));
    }

    private async findOrFail(companyUuid: string, uuid: string): Promise<Unit> {
        const unit = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!unit) throw new AppError(ErrorCodes.UNIT.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return unit;
    }

    /** Name and short name are each unique inside the company, ignoring case ("KG" = "kg"). */
    private async assertNamesFree(companyUuid: string, body: UnitBody, exceptUuid?: string): Promise<void> {
        const qb = this.repo.createQueryBuilder("unit")
            .where("unit.companyUuid = :companyUuid", { companyUuid })
            .andWhere("(LOWER(unit.name) = LOWER(:name) OR LOWER(unit.shortName) = LOWER(:shortName))", body);
        if (exceptUuid) qb.andWhere("unit.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.UNIT.NAME_TAKEN);
    }

    async list(companyUuid: string): Promise<IUnit[]> {
        const units = await this.repo.find({ where: { companyUuid }, order: { name: "ASC" } });
        return units.map(UnitService.toUnit);
    }

    async create(companyUuid: string, body: UnitBody): Promise<IUnit> {
        await this.assertNamesFree(companyUuid, body);
        return UnitService.toUnit(await this.repo.save(this.repo.create({ ...body, companyUuid })));
    }

    async update(companyUuid: string, uuid: string, body: UnitBody): Promise<IUnit> {
        const unit = await this.findOrFail(companyUuid, uuid);
        await this.assertNamesFree(companyUuid, body, uuid);
        Object.assign(unit, body);
        return UnitService.toUnit(await this.repo.save(unit));
    }

    async delete(companyUuid: string, uuid: string): Promise<void> {
        await this.repo.remove(await this.findOrFail(companyUuid, uuid));
    }
}
