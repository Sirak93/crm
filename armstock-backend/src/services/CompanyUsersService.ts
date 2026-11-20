import bcrypt from "bcrypt";
import { Brackets, In, Not } from "typeorm";
import { AccountType, ErrorCodes, UserStatus, keepLocked, lockedPermissions, type ICompanyUser, type ICompanyUsersSummary, type IPaginationMeta, type Permission } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { AppError } from "../utils/AppError";
import { BCRYPT_ROUNDS } from "../constants/AuthConstants";
import { AuthCacheService } from "./AuthCacheService";
import { RoleService } from "./RoleService";
import type { IRequestUser } from "../interfaces/IRequestUser";
import type { CompanyUserAccessBody, CompanyUserBody, CompanyUserCreateBody, CompanyUsersQuery } from "../schemas/CompanyUserSchema";

/**
 * A company's users, managed by the Platform Owner and by company members through their own
 * routes. `actor` is the user making the change - nobody changes their own role, login, or status,
 * and only the Platform Owner changes the Company Owner account.
 */
export class CompanyUsersService {
    private repo = AppDataSource.getRepository(User);
    private roleService = new RoleService();

    private static toCompanyUser(user: User, role: Role | null): ICompanyUser {
        return {
            uuid: user.uuid,
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            position: user.position,
            email: user.email,
            accountType: user.accountType,
            role: role ? { uuid: role.uuid, name: role.name } : null,
            canLogIn: user.canLogIn,
            permissions: user.permissions,
            status: user.status,
            hasPassword: !!user.password,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            createdAt: user.createdAt.toISOString(),
        };
    }

    /** Roles of one page, by a bounded `uuid IN (...)` lookup instead of a join on the paginated query. */
    private async withRoles(companyUuid: string, users: User[]): Promise<ICompanyUser[]> {
        const roleUuids = [...new Set(users.map((u) => u.roleUuid).filter((uuid): uuid is string => !!uuid))];
        const roles = roleUuids.length
            ? await AppDataSource.getRepository(Role).find({ where: { uuid: In(roleUuids), companyUuid } })
            : [];
        const roleMap = new Map(roles.map((r) => [r.uuid, r]));
        return users.map((u) => CompanyUsersService.toCompanyUser(u, u.roleUuid ? roleMap.get(u.roleUuid) ?? null : null));
    }

    private async toResult(companyUuid: string, user: User): Promise<ICompanyUser> {
        const [item] = await this.withRoles(companyUuid, [user]);
        return item!;
    }

    private async findOrFail(companyUuid: string, uuid: string): Promise<User> {
        const user = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!user) throw new AppError(ErrorCodes.USER.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return user;
    }

    private static assertNotOwnerFromCompany(user: User, actor: IRequestUser): void {
        if (user.accountType === AccountType.COMPANY_OWNER && actor.accountType !== AccountType.PLATFORM_OWNER) {
            throw new AppError(ErrorCodes.USER.OWNER_LOCKED, undefined, undefined, { uuid: user.uuid, actorUuid: actor.userUUID });
        }
    }

    private static assertNotSelf(user: User, actor: IRequestUser): void {
        if (user.uuid === actor.userUUID) throw new AppError(ErrorCodes.USER.OWN_ACCOUNT);
    }

    private async assertEmailFree(email: string | null, exceptUuid?: string): Promise<void> {
        if (!email) return;
        const where = exceptUuid ? { email, uuid: Not(exceptUuid) } : { email };
        if (await this.repo.exists({ where })) throw new AppError(ErrorCodes.USER.EMAIL_TAKEN);
    }

    async list(companyUuid: string, query: CompanyUsersQuery): Promise<{ items: ICompanyUser[]; meta: IPaginationMeta }> {
        const { page, pageSize, search, status, roleUuid } = query;

        const qb = this.repo.createQueryBuilder("user").where("user.companyUuid = :companyUuid", { companyUuid });
        if (status) qb.andWhere("user.status = :status", { status });
        if (roleUuid) qb.andWhere("user.roleUuid = :roleUuid", { roleUuid });
        if (search) {
            qb.andWhere(new Brackets((w) => {
                w.where("user.firstName ILIKE :search", { search: `%${search}%` })
                    .orWhere("user.lastName ILIKE :search")
                    .orWhere("user.position ILIKE :search")
                    .orWhere("user.email ILIKE :search");
            }));
        }

        const [rows, total] = await qb
            // Status values go Active -> Blocked -> Archived, so archived users come last.
            .orderBy("user.status", "ASC")
            .addOrderBy("user.firstName", "ASC")
            .addOrderBy("user.lastName", "ASC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: await this.withRoles(companyUuid, rows),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async summary(companyUuid: string): Promise<ICompanyUsersSummary> {
        const row = await this.repo.createQueryBuilder("user")
            .select("COUNT(*) FILTER (WHERE user.status = :active)", "active")
            .addSelect("COUNT(*) FILTER (WHERE user.status = :blocked)", "blocked")
            .where("user.companyUuid = :companyUuid", { companyUuid })
            .setParameters({ active: UserStatus.ACTIVE, blocked: UserStatus.BLOCKED })
            .getRawOne<{ active: string; blocked: string }>();

        return { active: Number(row?.active ?? 0), blocked: Number(row?.blocked ?? 0) };
    }

    /**
     * Always a member. Permissions: the sent list when `canSetPermissions`, otherwise the role's set;
     * `locked` (owner-only) ones start off - only the Owner grants them.
     * The schema already requires email + password with login.
     */
    async create(companyUuid: string, body: CompanyUserCreateBody, canSetPermissions: boolean, locked: readonly Permission[]): Promise<ICompanyUser> {
        const [role] = await Promise.all([
            this.roleService.findOrFail(companyUuid, body.roleUuid),
            body.canLogIn ? this.assertEmailFree(body.email) : undefined,
        ]);

        const user = await this.repo.save(this.repo.create({
            companyUuid,
            accountType: AccountType.COMPANY_MEMBER,
            roleUuid: role.uuid,
            firstName: body.firstName,
            lastName: body.lastName,
            position: body.position,
            canLogIn: body.canLogIn,
            email: body.canLogIn ? body.email : null,
            password: body.canLogIn && body.password ? await bcrypt.hash(body.password, BCRYPT_ROUNDS) : null,
            permissions: body.canLogIn ? keepLocked(canSetPermissions && body.permissions ? body.permissions : role.permissions, [], locked) : [],
        }));
        return CompanyUsersService.toCompanyUser(user, role);
    }

    /** Basic data and login - never the role or permissions. */
    async update(companyUuid: string, uuid: string, actor: IRequestUser, body: CompanyUserBody): Promise<ICompanyUser> {
        const user = await this.findOrFail(companyUuid, uuid);
        CompanyUsersService.assertNotOwnerFromCompany(user, actor);

        const loginChanged = body.canLogIn !== user.canLogIn;
        if (loginChanged && user.accountType === AccountType.COMPANY_OWNER) throw new AppError(ErrorCodes.USER.OWNER_LOCKED);
        if (loginChanged) CompanyUsersService.assertNotSelf(user, actor);

        const email = body.canLogIn ? body.email : null;
        if (email !== user.email) await this.assertEmailFree(email, user.uuid);
        if (body.canLogIn && !body.password && !user.password) throw new AppError(ErrorCodes.USER.PASSWORD_REQUIRED);

        Object.assign(user, {
            firstName: body.firstName,
            lastName: body.lastName,
            position: body.position,
            canLogIn: body.canLogIn,
            email,
        });
        if (!body.canLogIn) {
            user.password = null;
            user.refreshToken = null;
            user.permissions = [];
        } else {
            if (body.password) user.password = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
            // Permissions were emptied when login was turned off - start again from the role.
            if (loginChanged && user.roleUuid) {
                const role = await this.roleService.findOrFail(companyUuid, user.roleUuid);
                user.permissions = keepLocked(role.permissions, [], lockedPermissions(actor.accountType));
            }
        }

        await this.repo.save(user);
        if (loginChanged) await AuthCacheService.setUserAccess(user);
        return this.toResult(companyUuid, user);
    }

    /** A member's role and own permission list (kept empty without login). Owner-only permissions stay as they are unless the Owner saves. */
    async setAccess(companyUuid: string, uuid: string, actor: IRequestUser, body: CompanyUserAccessBody): Promise<ICompanyUser> {
        const user = await this.findOrFail(companyUuid, uuid);
        CompanyUsersService.assertNotOwnerFromCompany(user, actor);
        CompanyUsersService.assertNotSelf(user, actor);
        // The Owner has no role, and the account type is never changed here.
        if (user.accountType !== AccountType.COMPANY_MEMBER) throw new AppError(ErrorCodes.USER.OWNER_LOCKED);

        const role = await this.roleService.findOrFail(companyUuid, body.roleUuid);
        user.roleUuid = role.uuid;
        user.permissions = user.canLogIn ? keepLocked(body.permissions, user.permissions, lockedPermissions(actor.accountType)) : [];

        await this.repo.save(user);
        await AuthCacheService.setUserAccess(user);
        return CompanyUsersService.toCompanyUser(user, role);
    }

    async setStatus(companyUuid: string, uuid: string, actor: IRequestUser, status: UserStatus): Promise<ICompanyUser> {
        const user = await this.findOrFail(companyUuid, uuid);
        CompanyUsersService.assertNotOwnerFromCompany(user, actor);
        CompanyUsersService.assertNotSelf(user, actor);

        user.status = status;
        await this.repo.save(user);
        await AuthCacheService.setUserAccess(user);
        return this.toResult(companyUuid, user);
    }
}
