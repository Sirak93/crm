import type { EntityManager } from "typeorm";
import { DEFAULT_ROLE_PERMISSIONS, DefaultRole, ErrorCodes, type INamedRef, type IRole, type IRoleInUse } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Role } from "../models/Role";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { DEFAULT_ROLE_NAMES } from "../constants/DefaultRoles";
import { AuthCacheService } from "./AuthCacheService";
import type { RoleBody } from "../schemas/RoleSchema";

export class RoleService {
    private repo = AppDataSource.getRepository(Role);
    private userRepo = AppDataSource.getRepository(User);

    private static toRole(role: Role, userCount: number): IRole {
        return { uuid: role.uuid, name: role.name, permissions: role.permissions, userCount };
    }

    /** Runs inside the caller's transaction (company create). */
    static async createDefaults(manager: EntityManager, companyUuid: string): Promise<void> {
        const repo = manager.getRepository(Role);
        const roles = Object.entries(DEFAULT_ROLE_NAMES).map(([role, name]) =>
            repo.create({ companyUuid, name, permissions: [...DEFAULT_ROLE_PERMISSIONS[Number(role) as DefaultRole]] }),
        );
        await repo.save(roles);
    }

    async findOrFail(companyUuid: string, uuid: string): Promise<Role> {
        const role = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!role) throw new AppError(ErrorCodes.ROLE.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return role;
    }

    /** Unique inside the company, ignoring case. */
    private async assertNameFree(companyUuid: string, name: string, exceptUuid?: string): Promise<void> {
        const qb = this.repo.createQueryBuilder("role")
            .where("role.companyUuid = :companyUuid", { companyUuid })
            .andWhere("LOWER(role.name) = LOWER(:name)", { name });
        if (exceptUuid) qb.andWhere("role.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.ROLE.NAME_TAKEN);
    }

    /** Users per role - active, blocked, and archived. */
    private async userCounts(companyUuid: string): Promise<Map<string, number>> {
        const rows = await this.userRepo.createQueryBuilder("user")
            .select("user.roleUuid", "roleUuid")
            .addSelect("COUNT(*)::int", "count")
            .where("user.companyUuid = :companyUuid", { companyUuid })
            .andWhere("user.roleUuid IS NOT NULL")
            .groupBy("user.roleUuid")
            .getRawMany<{ roleUuid: string; count: number }>();
        return new Map(rows.map((row) => [row.roleUuid, row.count]));
    }

    private countUsers(companyUuid: string, roleUuid: string): Promise<number> {
        return this.userRepo.count({ where: { companyUuid, roleUuid } });
    }

    /** Role picker - a company has few roles, so all of them. */
    async options(companyUuid: string): Promise<INamedRef[]> {
        const roles = await this.repo.find({ where: { companyUuid }, select: { uuid: true, name: true }, order: { name: "ASC" } });
        return roles.map((role) => ({ uuid: role.uuid, name: role.name }));
    }

    async list(companyUuid: string): Promise<IRole[]> {
        const [roles, counts] = await Promise.all([
            this.repo.find({ where: { companyUuid }, order: { name: "ASC" } }),
            this.userCounts(companyUuid),
        ]);
        return roles.map((role) => RoleService.toRole(role, counts.get(role.uuid) ?? 0));
    }

    async create(companyUuid: string, body: RoleBody): Promise<IRole> {
        await this.assertNameFree(companyUuid, body.name);
        const role = await this.repo.save(this.repo.create({ companyUuid, name: body.name, permissions: body.permissions }));
        return RoleService.toRole(role, 0);
    }

    /**
     * With `applyToUsers`, the role's users who log in get its new permissions, replacing their own changes.
     * The acting user is skipped - nobody changes their own permissions.
     */
    async update(companyUuid: string, uuid: string, actorUuid: string, body: RoleBody): Promise<IRole> {
        const [role] = await Promise.all([this.findOrFail(companyUuid, uuid), this.assertNameFree(companyUuid, body.name, uuid)]);
        role.name = body.name;
        role.permissions = body.permissions;

        const updatedUuids = await AppDataSource.transaction(async (manager) => {
            await manager.getRepository(Role).save(role);
            if (!body.applyToUsers) return [];
            const result = await manager.getRepository(User).createQueryBuilder()
                .update()
                .set({ permissions: role.permissions })
                .where("company_uuid = :companyUuid", { companyUuid })
                .andWhere("role_uuid = :uuid", { uuid })
                .andWhere("can_log_in = true")
                .andWhere("uuid != :actorUuid", { actorUuid })
                .returning(["uuid"])
                .execute();
            return (result.raw as { uuid: string }[]).map((row) => row.uuid);
        });
        if (updatedUuids.length) await AuthCacheService.setPermissions(updatedUuids, role.permissions);

        return RoleService.toRole(role, await this.countUsers(companyUuid, uuid));
    }

    async delete(companyUuid: string, uuid: string): Promise<void> {
        const [role, userCount] = await Promise.all([this.findOrFail(companyUuid, uuid), this.countUsers(companyUuid, uuid)]);
        if (userCount) {
            throw new AppError(ErrorCodes.ROLE.IN_USE, undefined, undefined, { uuid, userCount }, { userCount } satisfies IRoleInUse);
        }
        await this.repo.remove(role);
    }
}
