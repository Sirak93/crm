import { Brackets, In } from "typeorm";
import { ErrorCodes, ProductStatus, type IPaginationMeta, type IProduct } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Product } from "../models/Product";
import { MeasureUnit } from "../models/MeasureUnit";
import { ProductCategory } from "../models/ProductCategory";
import { AppError } from "../utils/AppError";
import { MeasureUnitService } from "./MeasureUnitService";
import { ProductCategoryService } from "./ProductCategoryService";
import type { ProductBody, ProductCreateBody, ProductsQuery } from "../schemas/ProductSchema";

export class ProductService {
    private repo = AppDataSource.getRepository(Product);
    private unitService = new MeasureUnitService();
    private categoryService = new ProductCategoryService();

    private static toProduct(product: Product, unit: MeasureUnit, category: ProductCategory): IProduct {
        return {
            uuid: product.uuid,
            name: product.name,
            code: product.code,
            status: product.status,
            measureUnit: MeasureUnitService.toUnit(unit),
            category: ProductCategoryService.toCategory(category),
            createdAt: product.createdAt.toISOString(),
        };
    }

    private async findOrFail(companyUuid: string, uuid: string): Promise<Product> {
        const product = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!product) throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return product;
    }

    /** Code is optional, but unique inside the company (ignoring case) when set. */
    private async assertCodeFree(companyUuid: string, code: string | null, exceptUuid?: string): Promise<void> {
        if (!code) return;
        const qb = this.repo.createQueryBuilder("product")
            .where("product.companyUuid = :companyUuid", { companyUuid })
            .andWhere("LOWER(product.code) = LOWER(:code)", { code });
        if (exceptUuid) qb.andWhere("product.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.PRODUCT.CODE_TAKEN);
    }

    /** Units and categories of one page, by bounded `uuid IN (...)` lookups instead of joins on the paginated query. */
    private async withRelations(companyUuid: string, products: Product[]): Promise<IProduct[]> {
        const unitUuids = [...new Set(products.map((p) => p.measureUnitUuid))];
        const categoryUuids = [...new Set(products.map((p) => p.categoryUuid))];
        const [units, categories] = await Promise.all([
            unitUuids.length ? AppDataSource.getRepository(MeasureUnit).find({ where: { uuid: In(unitUuids), companyUuid } }) : [],
            categoryUuids.length ? AppDataSource.getRepository(ProductCategory).find({ where: { uuid: In(categoryUuids), companyUuid } }) : [],
        ]);
        const unitMap = new Map(units.map((u) => [u.uuid, u]));
        const categoryMap = new Map(categories.map((c) => [c.uuid, c]));
        return products.map((p) => ProductService.toProduct(p, unitMap.get(p.measureUnitUuid)!, categoryMap.get(p.categoryUuid)!));
    }

    async list(companyUuid: string, query: ProductsQuery): Promise<{ items: IProduct[]; meta: IPaginationMeta }> {
        const { page, pageSize, search, categoryUuid, status } = query;

        const qb = this.repo.createQueryBuilder("product").where("product.companyUuid = :companyUuid", { companyUuid });
        if (search) {
            qb.andWhere(new Brackets((w) => {
                w.where("product.name ILIKE :search", { search: `%${search}%` }).orWhere("product.code ILIKE :search");
            }));
        }
        if (categoryUuid) qb.andWhere("product.categoryUuid = :categoryUuid", { categoryUuid });
        if (status) qb.andWhere("product.status = :status", { status });

        const [rows, total] = await qb
            .orderBy("product.name", "ASC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: await this.withRelations(companyUuid, rows),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async create(companyUuid: string, body: ProductCreateBody): Promise<IProduct> {
        // Both must belong to the same company - findOrFail checks that.
        const [unit, category] = await Promise.all([
            this.unitService.findOrFail(companyUuid, body.measureUnitUuid),
            this.categoryService.findOrFail(companyUuid, body.categoryUuid),
            this.assertCodeFree(companyUuid, body.code),
        ]);
        const product = await this.repo.save(this.repo.create({ ...body, companyUuid }));
        return ProductService.toProduct(product, unit, category);
    }

    /** The measure unit is not part of the body - it never changes after create. */
    async update(companyUuid: string, uuid: string, body: ProductBody): Promise<IProduct> {
        const product = await this.findOrFail(companyUuid, uuid);
        const [unit, category] = await Promise.all([
            this.unitService.findOrFail(companyUuid, product.measureUnitUuid),
            this.categoryService.findOrFail(companyUuid, body.categoryUuid),
            this.assertCodeFree(companyUuid, body.code, uuid),
        ]);
        Object.assign(product, body);
        await this.repo.save(product);
        return ProductService.toProduct(product, unit, category);
    }

    async setStatus(companyUuid: string, uuid: string, status: ProductStatus): Promise<IProduct> {
        const product = await this.findOrFail(companyUuid, uuid);
        product.status = status;
        await this.repo.save(product);
        const [item] = await this.withRelations(companyUuid, [product]);
        return item!;
    }
}
