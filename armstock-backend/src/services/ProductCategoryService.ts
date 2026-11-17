import type { EntityManager } from "typeorm";
import { ErrorCodes, type IProductCategory } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { ProductCategory } from "../models/ProductCategory";
import { AppError } from "../utils/AppError";
import { DEFAULT_PRODUCT_CATEGORIES } from "../constants/DefaultProductCategories";
import type { ProductCategoryBody } from "../schemas/ProductCategorySchema";

export class ProductCategoryService {
    private repo = AppDataSource.getRepository(ProductCategory);

    private static toCategory(category: ProductCategory): IProductCategory {
        return { uuid: category.uuid, name: category.name };
    }

    /** Runs inside the caller's transaction (company create). */
    static async createDefaults(manager: EntityManager, companyUuid: string): Promise<void> {
        const repo = manager.getRepository(ProductCategory);
        await repo.save(DEFAULT_PRODUCT_CATEGORIES.map((name) => repo.create({ name, companyUuid })));
    }

    private async findOrFail(companyUuid: string, uuid: string): Promise<ProductCategory> {
        const category = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!category) throw new AppError(ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return category;
    }

    /** Unique inside the company, ignoring case. */
    private async assertNameFree(companyUuid: string, name: string, exceptUuid?: string): Promise<void> {
        const qb = this.repo.createQueryBuilder("category")
            .where("category.companyUuid = :companyUuid", { companyUuid })
            .andWhere("LOWER(category.name) = LOWER(:name)", { name });
        if (exceptUuid) qb.andWhere("category.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.PRODUCT_CATEGORY.NAME_TAKEN);
    }

    async list(companyUuid: string): Promise<IProductCategory[]> {
        const categories = await this.repo.find({ where: { companyUuid }, order: { name: "ASC" } });
        return categories.map(ProductCategoryService.toCategory);
    }

    async create(companyUuid: string, body: ProductCategoryBody): Promise<IProductCategory> {
        await this.assertNameFree(companyUuid, body.name);
        return ProductCategoryService.toCategory(await this.repo.save(this.repo.create({ ...body, companyUuid })));
    }

    async update(companyUuid: string, uuid: string, body: ProductCategoryBody): Promise<IProductCategory> {
        const category = await this.findOrFail(companyUuid, uuid);
        await this.assertNameFree(companyUuid, body.name, uuid);
        Object.assign(category, body);
        return ProductCategoryService.toCategory(await this.repo.save(category));
    }

    async delete(companyUuid: string, uuid: string): Promise<void> {
        await this.repo.remove(await this.findOrFail(companyUuid, uuid));
    }
}
