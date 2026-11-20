import type { EntityManager } from "typeorm";
import { DEFAULT_ROLE_PERMISSIONS, DefaultRole, type INamedRef } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Role } from "../models/Role";
import { DEFAULT_ROLE_NAMES } from "../constants/DefaultRoles";

export class RoleService {
    private repo = AppDataSource.getRepository(Role);

    /** Runs inside the caller's transaction (company create). */
    static async createDefaults(manager: EntityManager, companyUuid: string): Promise<void> {
        const repo = manager.getRepository(Role);
        const roles = Object.entries(DEFAULT_ROLE_NAMES).map(([role, name]) =>
            repo.create({ companyUuid, name, permissions: [...DEFAULT_ROLE_PERMISSIONS[Number(role) as DefaultRole]] }),
        );
        await repo.save(roles);
    }

    /** Role picker - a company has few roles, so all of them. */
    async options(companyUuid: string): Promise<INamedRef[]> {
        const roles = await this.repo.find({ where: { companyUuid }, select: { uuid: true, name: true }, order: { name: "ASC" } });
        return roles.map((role) => ({ uuid: role.uuid, name: role.name }));
    }
}
