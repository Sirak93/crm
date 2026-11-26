import { In, type EntityManager } from "typeorm";
import {
    ErrorCodes,
    ProductStatus,
    RecipeStatus,
    type IPaginationMeta,
    type IRecipe,
    type IRecipeDetails,
    type IRecipeLine,
    type IRecipeOption,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Recipe } from "../models/Recipe";
import { RecipeLine } from "../models/RecipeLine";
import { Product } from "../models/Product";
import { StockOutRecipe } from "../models/StockOutRecipe";
import { AppError } from "../utils/AppError";
import { onUniqueViolation } from "../utils/onUniqueViolation";
import { UNIQUE_KEYS } from "../constants/UniqueKeys";
import { StockService } from "./StockService";
import type { RecipeBody, RecipesQuery } from "../schemas/RecipeSchema";

const UNIQUE_ERRORS = { [UNIQUE_KEYS.RECIPE_NAME]: ErrorCodes.RECIPE.NAME_TAKEN };

export class RecipeService {
    private repo = AppDataSource.getRepository(Recipe);
    private lineRepo = AppDataSource.getRepository(RecipeLine);
    private productRepo = AppDataSource.getRepository(Product);
    private stockOutRecipeRepo = AppDataSource.getRepository(StockOutRecipe);

    private static toRecipe(recipe: Recipe, lineCount: number): IRecipe {
        return {
            uuid: recipe.uuid,
            name: recipe.name,
            note: recipe.note,
            status: recipe.status,
            lineCount,
            createdAt: recipe.createdAt.toISOString(),
        };
    }

    async findOrFail(companyUuid: string, uuid: string): Promise<Recipe> {
        const recipe = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!recipe) throw new AppError(ErrorCodes.RECIPE.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return recipe;
    }

    /** Unique inside the company, ignoring case (citext) - archived recipes count too. */
    private async assertNameFree(companyUuid: string, name: string, exceptUuid?: string): Promise<void> {
        const qb = this.repo.createQueryBuilder("recipe")
            .where("recipe.companyUuid = :companyUuid", { companyUuid })
            .andWhere("recipe.name = :name", { name });
        if (exceptUuid) qb.andWhere("recipe.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.RECIPE.NAME_TAKEN);
    }

    /** Products must be the company's. A new line needs an active one; a line the recipe already had may keep an archived one. */
    private async assertProducts(companyUuid: string, body: RecipeBody, keptProductUuids: ReadonlySet<string>): Promise<void> {
        const productUuids = body.lines.map((line) => line.productUuid);
        const products = await this.productRepo.find({ where: { uuid: In(productUuids), companyUuid } });
        const productMap = new Map(products.map((p) => [p.uuid, p]));
        for (const uuid of productUuids) {
            const product = productMap.get(uuid);
            if (!product) throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND, undefined, undefined, { uuid });
            if (product.status === ProductStatus.ARCHIVED && !keptProductUuids.has(uuid)) {
                throw new AppError(ErrorCodes.PRODUCT.ARCHIVED, undefined, undefined, { uuid });
            }
        }
    }

    private static async saveLines(manager: EntityManager, recipe: Recipe, body: RecipeBody): Promise<void> {
        await manager.save(body.lines.map((line, index) => manager.create(RecipeLine, {
            ...line,
            recipeUuid: recipe.uuid,
            companyUuid: recipe.companyUuid,
            position: index + 1,
        })));
    }

    async list(companyUuid: string, query: RecipesQuery): Promise<{ items: IRecipe[]; meta: IPaginationMeta }> {
        const { page, pageSize, search, status } = query;

        const qb = this.repo.createQueryBuilder("recipe").where("recipe.companyUuid = :companyUuid", { companyUuid });
        if (search) qb.andWhere("recipe.name ILIKE :search", { search: `%${search}%` });
        if (status) qb.andWhere("recipe.status = :status", { status });

        const [rows, total] = await qb
            .orderBy("recipe.name", "ASC")
            .addOrderBy("recipe.uuid", "ASC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        const counts = rows.length
            ? await this.lineRepo.createQueryBuilder("line")
                .select("line.recipeUuid", "recipeUuid")
                .addSelect("COUNT(*)", "lineCount")
                .where("line.recipeUuid IN (:...uuids)", { uuids: rows.map((r) => r.uuid) })
                .groupBy("line.recipeUuid")
                .getRawMany<{ recipeUuid: string; lineCount: string }>()
            : [];
        const countMap = new Map(counts.map((c) => [c.recipeUuid, Number(c.lineCount)]));

        return {
            items: rows.map((recipe) => RecipeService.toRecipe(recipe, countMap.get(recipe.uuid) ?? 0)),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    /** Lines of the given recipes in their order, with their products, by recipe uuid. */
    private async linesOf(recipeUuids: string[]): Promise<Map<string, IRecipeLine[]>> {
        const byRecipe = new Map<string, IRecipeLine[]>(recipeUuids.map((uuid) => [uuid, []]));
        if (!recipeUuids.length) return byRecipe;
        const lines = await this.lineRepo.find({ where: { recipeUuid: In(recipeUuids) }, order: { position: "ASC" } });
        const products = lines.length
            ? await this.productRepo.find({ where: { uuid: In([...new Set(lines.map((l) => l.productUuid))]) } })
            : [];
        const productMap = new Map(products.map((p) => [p.uuid, p]));

        for (const line of lines) {
            byRecipe.get(line.recipeUuid)!.push({
                uuid: line.uuid,
                product: StockService.toLineProduct(productMap.get(line.productUuid)!),
                quantity: line.quantity,
            });
        }
        return byRecipe;
    }

    async get(companyUuid: string, uuid: string): Promise<IRecipeDetails> {
        const recipe = await this.findOrFail(companyUuid, uuid);
        const lines = (await this.linesOf([recipe.uuid])).get(recipe.uuid)!;
        return { ...RecipeService.toRecipe(recipe, lines.length), lines };
    }

    /** Active recipes for the stock-out form, with their lines so the form works out the amounts. */
    async options(companyUuid: string): Promise<IRecipeOption[]> {
        const recipes = await this.repo.find({ where: { companyUuid, status: RecipeStatus.ACTIVE }, order: { name: "ASC" } });
        const linesByRecipe = await this.linesOf(recipes.map((r) => r.uuid));
        return recipes.map((recipe) => ({ uuid: recipe.uuid, name: recipe.name, lines: linesByRecipe.get(recipe.uuid)! }));
    }

    async create(companyUuid: string, userUuid: string, body: RecipeBody): Promise<IRecipeDetails> {
        await Promise.all([this.assertNameFree(companyUuid, body.name), this.assertProducts(companyUuid, body, new Set())]);

        const uuid = await AppDataSource.transaction(async (manager) => {
            const recipe = await manager.save(manager.create(Recipe, {
                companyUuid,
                name: body.name,
                note: body.note,
                createdByUuid: userUuid,
            }));
            await RecipeService.saveLines(manager, recipe, body);
            return recipe.uuid;
        }).catch(onUniqueViolation(UNIQUE_ERRORS));
        return this.get(companyUuid, uuid);
    }

    /** Lines are replaced as a whole. */
    async update(companyUuid: string, uuid: string, body: RecipeBody): Promise<IRecipeDetails> {
        const recipe = await this.findOrFail(companyUuid, uuid);
        const oldLines = await this.lineRepo.find({ where: { recipeUuid: recipe.uuid } });
        await Promise.all([
            this.assertNameFree(companyUuid, body.name, uuid),
            this.assertProducts(companyUuid, body, new Set(oldLines.map((l) => l.productUuid))),
        ]);

        await AppDataSource.transaction(async (manager) => {
            recipe.name = body.name;
            recipe.note = body.note;
            await manager.save(recipe);
            await manager.delete(RecipeLine, { recipeUuid: recipe.uuid });
            await RecipeService.saveLines(manager, recipe, body);
        }).catch(onUniqueViolation(UNIQUE_ERRORS));
        return this.get(companyUuid, uuid);
    }

    async setStatus(companyUuid: string, uuid: string, status: RecipeStatus): Promise<IRecipe> {
        const recipe = await this.findOrFail(companyUuid, uuid);
        recipe.status = status;
        const [, lineCount] = await Promise.all([this.repo.save(recipe), this.lineRepo.count({ where: { recipeUuid: uuid } })]);
        return RecipeService.toRecipe(recipe, lineCount);
    }

    /** Only while no stock-out used it - otherwise it is archived instead. Its lines go with it (CASCADE). */
    async delete(companyUuid: string, uuid: string): Promise<void> {
        const recipe = await this.findOrFail(companyUuid, uuid);
        if (await this.stockOutRecipeRepo.exists({ where: { recipeUuid: uuid } })) throw new AppError(ErrorCodes.RECIPE.IN_USE, undefined, undefined, { uuid });
        await this.repo.remove(recipe);
    }
}
