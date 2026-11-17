import { ErrorCodes, type IUnit } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Unit } from "../models/Unit";
import { AppError } from "../utils/AppError";
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

    private async findOrFail(uuid: string): Promise<Unit> {
        const unit = await this.repo.findOne({ where: { uuid } });
        if (!unit) throw new AppError(ErrorCodes.UNIT.NOT_FOUND, undefined, undefined, { uuid });
        return unit;
    }

    /** Name and short name are each unique, ignoring case ("KG" = "kg"). */
    private async assertNamesFree(body: UnitBody, exceptUuid?: string): Promise<void> {
        const qb = this.repo.createQueryBuilder("unit")
            .where("(LOWER(unit.name) = LOWER(:name) OR LOWER(unit.shortName) = LOWER(:shortName))", body);
        if (exceptUuid) qb.andWhere("unit.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.UNIT.NAME_TAKEN);
    }

    async list(): Promise<IUnit[]> {
        const units = await this.repo.find({ order: { name: "ASC" } });
        return units.map(UnitService.toUnit);
    }

    async create(body: UnitBody): Promise<IUnit> {
        await this.assertNamesFree(body);
        return UnitService.toUnit(await this.repo.save(this.repo.create(body)));
    }

    async update(uuid: string, body: UnitBody): Promise<IUnit> {
        const unit = await this.findOrFail(uuid);
        await this.assertNamesFree(body, uuid);
        Object.assign(unit, body);
        return UnitService.toUnit(await this.repo.save(unit));
    }

    async delete(uuid: string): Promise<void> {
        const unit = await this.findOrFail(uuid);
        await this.repo.remove(unit);
    }
}
