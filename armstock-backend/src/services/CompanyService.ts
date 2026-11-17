import { ErrorCodes, type ICompany } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Company } from "../models/Company";
import { AppError } from "../utils/AppError";
import type { CompanyBody } from "../schemas/CompanySchema";

/** Company reads and edits shared by the Platform Owner and the Company Owner. */
export class CompanyService {
    private repo = AppDataSource.getRepository(Company);

    static toCompany(company: Company): ICompany {
        return {
            uuid: company.uuid,
            name: company.name,
            taxId: company.taxId,
            phone: company.phone,
            email: company.email,
            address: company.address,
            status: company.status,
            createdAt: company.createdAt.toISOString(),
        };
    }

    async findOrFail(uuid: string): Promise<Company> {
        const company = await this.repo.findOne({ where: { uuid } });
        if (!company) throw new AppError(ErrorCodes.COMPANY.NOT_FOUND, undefined, undefined, { uuid });
        return company;
    }

    async get(uuid: string): Promise<ICompany> {
        return CompanyService.toCompany(await this.findOrFail(uuid));
    }

    async update(uuid: string, body: CompanyBody): Promise<ICompany> {
        const company = await this.findOrFail(uuid);
        Object.assign(company, body);
        return CompanyService.toCompany(await this.repo.save(company));
    }
}
