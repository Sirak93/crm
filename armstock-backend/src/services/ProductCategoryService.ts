import type { EntityManager } from "typeorm";
import { ErrorCodes, type IProductCategory } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { ProductCategory } from "../models/ProductCategory";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { DEFAULT_PRODUCT_CATEGORIES } from "../constants/DefaultProductCategories";
import type { ProductCategoryBody } from "../schemas/ProductCategorySchema";
import { UNIQUE_KEYS } from "../constants/UniqueKeys";
import { onUniqueViolation } from "../utils/onUniqueViolation";

const UNIQUE_ERRORS = { [UNIQUE_KEYS.PRODUCT_CATEGORY_NAME]: ErrorCodes.PRODUCT_CATEGORY.NAME_TAKEN };

export class ProductCategoryService {
    private repo = AppDataSource.getRepository(ProductCategory);

    static toCategory(category: ProductCategory): IProductCategory {
        return { uuid: category.uuid, name: category.name };
    }

    /**
     * Runs inside the caller's transaction (company create). now() is the same for every row of one transaction,
     * so each default gets its own millisecond - the list shows them in this order.
     */
    static async createDefaults(manager: EntityManager, companyUuid: string): Promise<void> {
        const repo = manager.getRepository(ProductCategory);
        const start = Date.now();
        await repo.save(DEFAULT_PRODUCT_CATEGORIES.map((name, index) => repo.create({ name, companyUuid, createdAt: new Date(start + index) })));
    }

    async findOrFail(companyUuid: string, uuid: string): Promise<ProductCategory> {
        const category = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!category) throw new AppError(ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return category;
    }

    /** Unique inside the company, ignoring case. */
    private async assertNameFree(companyUuid: string, name: string, exceptUuid?: string): Promise<void> {
        const qb = this.repo.createQueryBuilder("category")
            .where("category.companyUuid = :companyUuid", { companyUuid })
            .andWhere("category.name = :name", { name });
        if (exceptUuid) qb.andWhere("category.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.PRODUCT_CATEGORY.NAME_TAKEN);
    }

    /** In the order they were added - the defaults first, in their list order. */
    async list(companyUuid: string): Promise<IProductCategory[]> {
        const categories = await this.repo.find({ where: { companyUuid }, order: { createdAt: "ASC", uuid: "ASC" } });
        return categories.map(ProductCategoryService.toCategory);
    }

    async create(companyUuid: string, body: ProductCategoryBody): Promise<IProductCategory> {
        await this.assertNameFree(companyUuid, body.name);
        return ProductCategoryService.toCategory(await this.repo.save(this.repo.create({ ...body, companyUuid })).catch(onUniqueViolation(UNIQUE_ERRORS)));
    }

    async update(companyUuid: string, uuid: string, body: ProductCategoryBody): Promise<IProductCategory> {
        const category = await this.findOrFail(companyUuid, uuid);
        await this.assertNameFree(companyUuid, body.name, uuid);
        Object.assign(category, body);
        return ProductCategoryService.toCategory(await this.repo.save(category).catch(onUniqueViolation(UNIQUE_ERRORS)));
    }

    async delete(companyUuid: string, uuid: string): Promise<void> {
        const category = await this.findOrFail(companyUuid, uuid);
        if (await AppDataSource.getRepository(Product).exists({ where: { categoryUuid: uuid } })) {
            throw new AppError(ErrorCodes.PRODUCT_CATEGORY.IN_USE);
        }
        await this.repo.remove(category);
    }
}
