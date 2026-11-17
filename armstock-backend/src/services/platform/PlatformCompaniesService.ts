import { CompanyStatus, type ICompany, type IPaginationMeta } from "armstock-shared";
import { AppDataSource } from "../../config/database";
import { Company } from "../../models/Company";
import { AuthCacheService } from "../AuthCacheService";
import { CompanyService } from "../CompanyService";
import { MeasureUnitService } from "../MeasureUnitService";
import type { CompanyBody } from "../../schemas/CompanySchema";
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

    /** The company and its default units, saved together. */
    async create(body: CompanyBody): Promise<ICompany> {
        const company = await AppDataSource.transaction(async (manager) => {
            const repo = manager.getRepository(Company);
            const saved = await repo.save(repo.create(body));
            await MeasureUnitService.createDefaults(manager, saved.uuid);
            return saved;
        });
        return CompanyService.toCompany(company);
    }

    get(uuid: string): Promise<ICompany> {
        return this.companyService.get(uuid);
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
