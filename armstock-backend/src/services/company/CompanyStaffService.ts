import { Brackets, In, type EntityManager } from "typeorm";
import { ErrorCodes, UserRole, UserStatus, type ICompanyStaff, type IPaginationMeta } from "armstock-shared";
import { AppDataSource } from "../../config/database";
import { CompanyStaff } from "../../models/CompanyStaff";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";
import { AuthCacheService } from "../AuthCacheService";
import { UserService } from "../UserService";
import type { PaginatedSearchQuery } from "../../schemas/SharedSchema";
import type { StaffBody, StaffLoginBody } from "../../schemas/company/CompanyStaffSchema";

export class CompanyStaffService {
    private repo = AppDataSource.getRepository(CompanyStaff);
    private userRepo = AppDataSource.getRepository(User);

    static toStaff(staff: CompanyStaff, login: User | null): ICompanyStaff {
        return {
            uuid: staff.uuid,
            firstName: staff.firstName,
            lastName: staff.lastName,
            position: staff.position,
            login: login ? UserService.toStaffLogin(login) : null,
            createdAt: staff.createdAt.toISOString(),
        };
    }

    /** Runs inside the caller's transaction. */
    static async createStaff(manager: EntityManager, companyUuid: string, body: StaffBody): Promise<CompanyStaff> {
        const repo = manager.getRepository(CompanyStaff);
        return repo.save(repo.create({ ...body, companyUuid }));
    }

    private async findOrFail(companyUuid: string, uuid: string): Promise<CompanyStaff> {
        const staff = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!staff) throw new AppError(ErrorCodes.STAFF.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return staff;
    }

    private findLogin(staffUuid: string): Promise<User | null> {
        return this.userRepo.findOne({ where: { staffUuid } });
    }

    /** The staff member's login, which the acting user may change - never their own. */
    private async findLoginToChange(companyUuid: string, staffUuid: string, actorUuid: string): Promise<{ staff: CompanyStaff; login: User }> {
        const staff = await this.findOrFail(companyUuid, staffUuid);
        const login = await this.findLogin(staff.uuid);
        if (!login) throw new AppError(ErrorCodes.STAFF.NO_LOGIN);
        if (login.uuid === actorUuid) throw new AppError(ErrorCodes.STAFF.OWN_LOGIN);
        return { staff, login };
    }

    async list(companyUuid: string, query: PaginatedSearchQuery): Promise<{ items: ICompanyStaff[]; meta: IPaginationMeta }> {
        const { page, pageSize, search } = query;

        const qb = this.repo.createQueryBuilder("staff").where("staff.companyUuid = :companyUuid", { companyUuid });
        if (search) {
            qb.andWhere(new Brackets((w) => {
                w.where("staff.firstName ILIKE :search", { search: `%${search}%` })
                    .orWhere("staff.lastName ILIKE :search")
                    .orWhere("staff.position ILIKE :search");
            }));
        }

        const [rows, total] = await qb
            .orderBy("staff.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        // Bounded `IN (...)` lookup instead of a join on the paginated query.
        const logins = rows.length
            ? await this.userRepo.find({ where: { staffUuid: In(rows.map((row) => row.uuid)) } })
            : [];
        const loginMap = new Map(logins.map((login) => [login.staffUuid, login]));

        return {
            items: rows.map((row) => CompanyStaffService.toStaff(row, loginMap.get(row.uuid) ?? null)),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async create(companyUuid: string, body: StaffBody): Promise<ICompanyStaff> {
        const staff = await CompanyStaffService.createStaff(AppDataSource.manager, companyUuid, body);
        return CompanyStaffService.toStaff(staff, null);
    }

    async update(companyUuid: string, uuid: string, body: StaffBody): Promise<ICompanyStaff> {
        const staff = await this.findOrFail(companyUuid, uuid);
        Object.assign(staff, body);
        const [saved, login] = await Promise.all([this.repo.save(staff), this.findLogin(staff.uuid)]);
        return CompanyStaffService.toStaff(saved, login);
    }

    async giveLogin(companyUuid: string, uuid: string, body: StaffLoginBody): Promise<ICompanyStaff> {
        const staff = await this.findOrFail(companyUuid, uuid);
        if (await this.findLogin(staff.uuid)) throw new AppError(ErrorCodes.STAFF.HAS_LOGIN);

        const login = await UserService.createLogin(AppDataSource.manager, { ...body, companyUuid, staffUuid: staff.uuid });
        return CompanyStaffService.toStaff(staff, login);
    }

    async setRole(companyUuid: string, uuid: string, actorUuid: string, role: UserRole): Promise<ICompanyStaff> {
        const { staff, login } = await this.findLoginToChange(companyUuid, uuid, actorUuid);
        login.role = role;
        await this.userRepo.save(login);
        await AuthCacheService.setUserAccess(login);
        return CompanyStaffService.toStaff(staff, login);
    }

    async setLoginStatus(companyUuid: string, uuid: string, actorUuid: string, status: UserStatus): Promise<ICompanyStaff> {
        const { staff, login } = await this.findLoginToChange(companyUuid, uuid, actorUuid);
        login.status = status;
        await this.userRepo.save(login);
        await AuthCacheService.setUserAccess(login);
        return CompanyStaffService.toStaff(staff, login);
    }
}
