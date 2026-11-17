import { CompanyStatus, UserRole, type ICompany, type ICompanyStaff, type IPaginationMeta } from "armstock-shared";
import { AppDataSource } from "../../config/database";
import { Company } from "../../models/Company";
import { AuthCacheService } from "../AuthCacheService";
import { CompanyService } from "../CompanyService";
import { CompanyStaffService } from "../company/CompanyStaffService";
import { UserService } from "../UserService";
import type { CompanyBody } from "../../schemas/CompanySchema";
import type { PaginatedSearchQuery } from "../../schemas/SharedSchema";
import type { CompanyOwnerBody } from "../../schemas/platform/PlatformCompaniesSchema";

export class PlatformCompaniesService {
    private repo = AppDataSource.getRepository(Company);
    private companyService = new CompanyService();

    async list(query: PaginatedSearchQuery): Promise<{ items: ICompany[]; meta: IPaginationMeta }> {
        const { page, pageSize, search } = query;

        const qb = this.repo.createQueryBuilder("company");
        if (search) qb.where("company.name ILIKE :search", { search: `%${search}%` });

        const [rows, total] = await qb
            .orderBy("company.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: rows.map(CompanyService.toCompany),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async create(body: CompanyBody): Promise<ICompany> {
        const company = await this.repo.save(this.repo.create(body));
        return CompanyService.toCompany(company);
    }

    update(uuid: string, body: CompanyBody): Promise<ICompany> {
        return this.companyService.update(uuid, body);
    }

    async setStatus(uuid: string, status: CompanyStatus): Promise<ICompany> {
        const company = await this.companyService.findOrFail(uuid);
        company.status = status;
        await this.repo.save(company);
        await AuthCacheService.setCompanyStatus(uuid, status);
        return CompanyService.toCompany(company);
    }

    /** Staff record + Company Owner login, saved together. */
    async addOwner(uuid: string, body: CompanyOwnerBody): Promise<ICompanyStaff> {
        const company = await this.companyService.findOrFail(uuid);
        const { email, password, ...staffBody } = body;

        return AppDataSource.transaction(async (manager) => {
            const staff = await CompanyStaffService.createStaff(manager, company.uuid, staffBody);
            const login = await UserService.createLogin(manager, {
                email,
                password,
                role: UserRole.COMPANY_OWNER,
                companyUuid: company.uuid,
                staffUuid: staff.uuid,
            });
            return CompanyStaffService.toStaff(staff, login);
        });
    }
}
