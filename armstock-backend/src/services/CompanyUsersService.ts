import bcrypt from "bcrypt";
import { Brackets, Not } from "typeorm";
import {
    COMPANY_LOGIN_ROLES,
    ErrorCodes,
    UserStatus,
    type ICompanyUser,
    type IPaginationMeta,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { BCRYPT_ROUNDS } from "../constants/AuthConstants";
import { AuthCacheService } from "./AuthCacheService";
import type { PaginatedSearchQuery } from "../schemas/SharedSchema";
import type { CompanyUserBody } from "../schemas/CompanyUserSchema";

/**
 * A company's users, managed by the Platform Owner and the Company Owner through their own
 * routes. `actorUuid` is the user making the change - nobody changes their own role or status.
 */
export class CompanyUsersService {
    private repo = AppDataSource.getRepository(User);

    private static toCompanyUser(user: User): ICompanyUser {
        return {
            uuid: user.uuid,
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            position: user.position,
            email: user.email,
            role: user.role,
            status: user.status,
            hasPassword: !!user.password,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            createdAt: user.createdAt.toISOString(),
        };
    }

    private async findOrFail(companyUuid: string, uuid: string): Promise<User> {
        const user = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!user) throw new AppError(ErrorCodes.USER.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return user;
    }

    private async assertEmailFree(email: string | null, exceptUuid?: string): Promise<void> {
        if (!email) return;
        const where = exceptUuid ? { email, uuid: Not(exceptUuid) } : { email };
        if (await this.repo.exists({ where })) throw new AppError(ErrorCodes.USER.EMAIL_TAKEN);
    }

    async list(companyUuid: string, query: PaginatedSearchQuery): Promise<{ items: ICompanyUser[]; meta: IPaginationMeta }> {
        const { page, pageSize, search } = query;

        const qb = this.repo.createQueryBuilder("user").where("user.companyUuid = :companyUuid", { companyUuid });
        if (search) {
            qb.andWhere(new Brackets((w) => {
                w.where("user.firstName ILIKE :search", { search: `%${search}%` })
                    .orWhere("user.lastName ILIKE :search")
                    .orWhere("user.position ILIKE :search")
                    .orWhere("user.email ILIKE :search");
            }));
        }

        const [rows, total] = await qb
            .orderBy("user.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: rows.map(CompanyUsersService.toCompanyUser),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    /** The schema already requires email + password for a login role. */
    async create(companyUuid: string, body: CompanyUserBody): Promise<ICompanyUser> {
        await this.assertEmailFree(body.email);

        const canLogIn = COMPANY_LOGIN_ROLES.includes(body.role);
        const user = await this.repo.save(this.repo.create({
            ...body,
            companyUuid,
            password: canLogIn && body.password ? await bcrypt.hash(body.password, BCRYPT_ROUNDS) : null,
        }));
        return CompanyUsersService.toCompanyUser(user);
    }

    async update(companyUuid: string, uuid: string, actorUuid: string, body: CompanyUserBody): Promise<ICompanyUser> {
        const user = await this.findOrFail(companyUuid, uuid);
        const roleChanged = body.role !== user.role;
        if (roleChanged && user.uuid === actorUuid) throw new AppError(ErrorCodes.USER.OWN_ACCOUNT);
        if (body.email !== user.email) await this.assertEmailFree(body.email, user.uuid);

        const canLogIn = COMPANY_LOGIN_ROLES.includes(body.role);
        if (canLogIn && !body.password && !user.password) throw new AppError(ErrorCodes.USER.PASSWORD_REQUIRED);

        Object.assign(user, {
            firstName: body.firstName,
            lastName: body.lastName,
            position: body.position,
            email: body.email,
            role: body.role,
        });
        if (!canLogIn) {
            user.password = null;
            user.refreshToken = null;
        } else if (body.password) {
            user.password = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
        }

        await this.repo.save(user);
        if (roleChanged) await AuthCacheService.setUserAccess(user);
        return CompanyUsersService.toCompanyUser(user);
    }

    async setStatus(companyUuid: string, uuid: string, actorUuid: string, status: UserStatus): Promise<ICompanyUser> {
        const user = await this.findOrFail(companyUuid, uuid);
        if (user.uuid === actorUuid) throw new AppError(ErrorCodes.USER.OWN_ACCOUNT);

        user.status = status;
        await this.repo.save(user);
        await AuthCacheService.setUserAccess(user);
        return CompanyUsersService.toCompanyUser(user);
    }
}
