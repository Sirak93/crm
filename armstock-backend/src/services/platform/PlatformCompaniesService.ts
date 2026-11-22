import bcrypt from "bcrypt";
import { AccountType, CompanyStatus, ErrorCodes, type ICompany, type IPaginationMeta } from "armstock-shared";
import { AppDataSource } from "../../config/database";
import { Company } from "../../models/Company";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";
import { BCRYPT_ROUNDS } from "../../constants/AuthConstants";
import { AuthCacheService } from "../AuthCacheService";
import { CompanyService } from "../CompanyService";
import { MeasureUnitService } from "../MeasureUnitService";
import { ProductCategoryService } from "../ProductCategoryService";
import { RoleService } from "../RoleService";
import type { CompanyBody, CompanyCreateBody } from "../../schemas/CompanySchema";
import type { PaginatedSearchQuery } from "../../schemas/SharedSchema";

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

    /** The company with its one Owner and its default units, product categories, and roles, saved together. */
    async create(body: CompanyCreateBody): Promise<ICompany> {
        const { owner, ...companyData } = body;
        if (await AppDataSource.getRepository(User).exists({ where: { email: owner.email } })) {
            throw new AppError(ErrorCodes.USER.EMAIL_TAKEN);
        }
        const password = await bcrypt.hash(owner.password, BCRYPT_ROUNDS);

        const company = await AppDataSource.transaction(async (manager) => {
            const repo = manager.getRepository(Company);
            const saved = await repo.save(repo.create(companyData));
            const userRepo = manager.getRepository(User);
            await userRepo.save(userRepo.create({
                companyUuid: saved.uuid,
                accountType: AccountType.COMPANY_OWNER,
                firstName: owner.firstName,
                lastName: owner.lastName,
                email: owner.email,
                password,
            }));
            await MeasureUnitService.createDefaults(manager, saved.uuid);
            await ProductCategoryService.createDefaults(manager, saved.uuid);
            await RoleService.createDefaults(manager, saved.uuid);
            return saved;
        });
        return CompanyService.toCompany(company);
    }

    get(uuid: string): Promise<ICompany> {
        return this.companyService.get(uuid);
    }

    /** For the company's own sub-routes (roles, users), so an unknown company is "not found", not empty. */
    async assertExists(uuid: string): Promise<void> {
        await this.companyService.findOrFail(uuid);
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
}
