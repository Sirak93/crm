import type { EntityManager } from "typeorm";
import { ErrorCodes, type IMeasureUnit } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { MeasureUnit } from "../models/MeasureUnit";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { DEFAULT_MEASURE_UNITS } from "../constants/DefaultMeasureUnits";
import type { MeasureUnitBody } from "../schemas/MeasureUnitSchema";
import { UNIQUE_KEYS } from "../constants/UniqueKeys";
import { onUniqueViolation } from "../utils/onUniqueViolation";

const UNIQUE_ERRORS = {
    [UNIQUE_KEYS.MEASURE_UNIT_NAME]: ErrorCodes.MEASURE_UNIT.NAME_TAKEN,
    [UNIQUE_KEYS.MEASURE_UNIT_SHORT_NAME]: ErrorCodes.MEASURE_UNIT.NAME_TAKEN,
};

export class MeasureUnitService {
    private repo = AppDataSource.getRepository(MeasureUnit);

    static toUnit(unit: MeasureUnit): IMeasureUnit {
        return {
            uuid: unit.uuid,
            name: unit.name,
            shortName: unit.shortName,
            allowsDecimals: unit.allowsDecimals,
        };
    }

    /** Runs inside the caller's transaction (company create). */
    static async createDefaults(manager: EntityManager, companyUuid: string): Promise<void> {
        const repo = manager.getRepository(MeasureUnit);
        await repo.save(DEFAULT_MEASURE_UNITS.map((unit) => repo.create({ ...unit, companyUuid })));
    }

    async findOrFail(companyUuid: string, uuid: string): Promise<MeasureUnit> {
        const unit = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!unit) throw new AppError(ErrorCodes.MEASURE_UNIT.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return unit;
    }

    /** Name and short name are each unique inside the company, ignoring case ("KG" = "kg"). */
    private async assertNamesFree(companyUuid: string, body: MeasureUnitBody, exceptUuid?: string): Promise<void> {
        const qb = this.repo.createQueryBuilder("unit")
            .where("unit.companyUuid = :companyUuid", { companyUuid })
            .andWhere("(unit.name = :name OR unit.shortName = :shortName)", body);
        if (exceptUuid) qb.andWhere("unit.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.MEASURE_UNIT.NAME_TAKEN);
    }

    async list(companyUuid: string): Promise<IMeasureUnit[]> {
        const units = await this.repo.find({ where: { companyUuid }, order: { name: "ASC" } });
        return units.map(MeasureUnitService.toUnit);
    }

    async create(companyUuid: string, body: MeasureUnitBody): Promise<IMeasureUnit> {
        await this.assertNamesFree(companyUuid, body);
        return MeasureUnitService.toUnit(await this.repo.save(this.repo.create({ ...body, companyUuid })).catch(onUniqueViolation(UNIQUE_ERRORS)));
    }

    async update(companyUuid: string, uuid: string, body: MeasureUnitBody): Promise<IMeasureUnit> {
        const unit = await this.findOrFail(companyUuid, uuid);
        await this.assertNamesFree(companyUuid, body, uuid);
        if (unit.allowsDecimals && !body.allowsDecimals && await this.isUsed(uuid)) {
            throw new AppError(ErrorCodes.MEASURE_UNIT.DECIMALS_IN_USE, undefined, undefined, { uuid });
        }
        Object.assign(unit, body);
        return MeasureUnitService.toUnit(await this.repo.save(unit).catch(onUniqueViolation(UNIQUE_ERRORS)));
    }

    private isUsed(uuid: string): Promise<boolean> {
        return AppDataSource.getRepository(Product).exists({ where: { measureUnitUuid: uuid } });
    }

    async delete(companyUuid: string, uuid: string): Promise<void> {
        const unit = await this.findOrFail(companyUuid, uuid);
        if (await this.isUsed(uuid)) {
            throw new AppError(ErrorCodes.MEASURE_UNIT.IN_USE);
        }
        await this.repo.remove(unit);
    }
}
