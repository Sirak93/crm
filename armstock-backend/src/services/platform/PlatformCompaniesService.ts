import { ErrorCodes, type ICompany, type IPaginationMeta } from "armstock-shared";
import { AppDataSource } from "../../config/database";
import { Company } from "../../models/Company";
import { AppError } from "../../utils/AppError";
import { AuthCacheService } from "../AuthCacheService";
import type { CompanyBody, PlatformCompaniesQuery } from "../../schemas/platform/PlatformCompaniesSchema";

export class PlatformCompaniesService {
    private repo = AppDataSource.getRepository(Company);

    private static toCompany(company: Company): ICompany {
        return {
            uuid: company.uuid,
            name: company.name,
            taxId: company.taxId,
            phone: company.phone,
            email: company.email,
            address: company.address,
            isActive: company.isActive,
            createdAt: company.createdAt.toISOString(),
        };
    }

    private async findOrFail(uuid: string): Promise<Company> {
        const company = await this.repo.findOne({ where: { uuid } });
        if (!company) throw new AppError(ErrorCodes.COMPANY.NOT_FOUND, undefined, undefined, { uuid });
        return company;
    }

    async list(query: PlatformCompaniesQuery): Promise<{ items: ICompany[]; meta: IPaginationMeta }> {
        const { page, pageSize, search } = query;

        const qb = this.repo.createQueryBuilder("company");
        if (search) qb.where("company.name ILIKE :search", { search: `%${search}%` });

        const [rows, total] = await qb
            .orderBy("company.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: rows.map(PlatformCompaniesService.toCompany),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async create(body: CompanyBody): Promise<ICompany> {
        const company = await this.repo.save(this.repo.create(body));
        return PlatformCompaniesService.toCompany(company);
    }

    async update(uuid: string, body: CompanyBody): Promise<ICompany> {
        const company = await this.findOrFail(uuid);
        Object.assign(company, body);
        return PlatformCompaniesService.toCompany(await this.repo.save(company));
    }

    async setActive(uuid: string, isActive: boolean): Promise<ICompany> {
        const company = await this.findOrFail(uuid);
        company.isActive = isActive;
        await this.repo.save(company);
        await AuthCacheService.setCompanyActive(uuid, isActive);
        return PlatformCompaniesService.toCompany(company);
    }
}
