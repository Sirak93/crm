import { In, type EntityManager, type SelectQueryBuilder } from "typeorm";
import {
    ErrorCodes,
    KITCHEN_BALANCE_ENABLED,
    RECIPE_QUANTITY_DECIMALS,
    RecipeStatus,
    StockOutDepartment,
    StockOutReason,
    SupplierStatus,
    type IPaginationMeta,
    type IStockOut,
    type IStockOutDetails,
    type IStockOutLine,
    type IStockOutRecipe,
    type IStockOutReceiver,
    type IStockOutSummary,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { StockOut } from "../models/StockOut";
import { StockOutLine } from "../models/StockOutLine";
import { StockOutRecipe } from "../models/StockOutRecipe";
import { StockOutRecipeLine } from "../models/StockOutRecipeLine";
import { Recipe } from "../models/Recipe";
import { RecipeLine } from "../models/RecipeLine";
import { Product } from "../models/Product";
import { Supplier } from "../models/Supplier";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { formatDocumentNumber, saveNumberedDocument, STOCK_OUT_NUMBER_PREFIX } from "../utils/documentNumber";
import { userName } from "../utils/userName";
import { StockService } from "./StockService";
import { SupplierReturnService } from "./SupplierReturnService";
import type { StockOutBody, StockOutFilters, StockOutsQuery } from "../schemas/StockOutSchema";
import { assertExportRows } from "../utils/excelReport";

/** The lines a recipe row is copied from - its current recipe lines, or the doc's own saved copy. */
type RecipeLinesMap = Map<string, Pick<RecipeLine, "productUuid" | "position" | "quantity">[]>;

export class StockOutService {
    private repo = AppDataSource.getRepository(StockOut);
    private lineRepo = AppDataSource.getRepository(StockOutLine);
    private productRepo = AppDataSource.getRepository(Product);
    private supplierRepo = AppDataSource.getRepository(Supplier);
    private userRepo = AppDataSource.getRepository(User);
    private recipeRepo = AppDataSource.getRepository(Recipe);
    private recipeLineRepo = AppDataSource.getRepository(RecipeLine);
    private outRecipeRepo = AppDataSource.getRepository(StockOutRecipe);
    private outRecipeLineRepo = AppDataSource.getRepository(StockOutRecipeLine);

    private async findOrFail(companyUuid: string, uuid: string): Promise<StockOut> {
        const doc = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!doc) throw new AppError(ErrorCodes.STOCK_OUT.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return doc;
    }

    private async findOwnOrFail(companyUuid: string, uuid: string, userUuid: string): Promise<StockOut> {
        const doc = await this.findOrFail(companyUuid, uuid);
        if (doc.createdByUuid !== userUuid) {
            throw new AppError(ErrorCodes.STOCK_OUT.NOT_CREATOR, undefined, undefined, { uuid, userUuid });
        }
        return doc;
    }

    /**
     * Products, recipes, supplier and receiver must be the company's. Archived products need no check here:
     * one at 0 fails the stock check. The supplier must be active unless the document already had it.
     * Recipes must be active, and each of their products needs a line in the totals. A recipe the document
     * already had keeps its saved copy, so it may be archived or changed since.
     */
    private async assertReferences(
        companyUuid: string,
        body: StockOutBody,
        existingSupplierUuid: string | null,
        savedLines: RecipeLinesMap = new Map(),
    ): Promise<RecipeLinesMap> {
        const productUuids = body.lines.map((line) => line.productUuid);
        const recipeUuids = body.recipes.map((row) => row.recipeUuid).filter((uuid) => !savedLines.has(uuid));
        const [products, recipes, recipeLines, supplier, receiverExists] = await Promise.all([
            this.productRepo.find({ where: { uuid: In(productUuids), companyUuid } }),
            recipeUuids.length ? this.recipeRepo.find({ where: { uuid: In(recipeUuids), companyUuid } }) : [],
            recipeUuids.length
                ? this.recipeLineRepo.find({ where: { recipeUuid: In(recipeUuids), companyUuid }, order: { position: "ASC" } })
                : [],
            body.supplierUuid ? this.supplierRepo.findOne({ where: { uuid: body.supplierUuid, companyUuid } }) : null,
            body.receiverUuid ? this.userRepo.exists({ where: { uuid: body.receiverUuid, companyUuid } }) : true,
        ]);

        const productMap = new Map(products.map((p) => [p.uuid, p]));
        for (const line of body.lines) {
            const product = productMap.get(line.productUuid);
            if (!product) throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND, undefined, undefined, { uuid: line.productUuid });
            StockService.assertQuantityFitsUnit(product, line.quantity);
            StockService.assertQuantityFitsUnit(product, line.extraQuantity);
        }

        const recipeMap = new Map(recipes.map((r) => [r.uuid, r]));
        for (const uuid of recipeUuids) {
            const recipe = recipeMap.get(uuid);
            if (!recipe) throw new AppError(ErrorCodes.RECIPE.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
            if (recipe.status === RecipeStatus.ARCHIVED) throw new AppError(ErrorCodes.RECIPE.ARCHIVED, undefined, undefined, { uuid });
        }

        const linesByRecipe: RecipeLinesMap = new Map(body.recipes.map((row) => [row.recipeUuid, savedLines.get(row.recipeUuid) ?? []]));
        for (const line of recipeLines) linesByRecipe.get(line.recipeUuid)!.push(line);

        const missing = [...linesByRecipe.values()].flat().filter((line) => !productMap.has(line.productUuid));
        if (missing.length) {
            throw new AppError(ErrorCodes.STOCK_OUT.RECIPE_PRODUCT_MISSING, undefined, undefined, {
                productUuids: [...new Set(missing.map((line) => line.productUuid))],
            });
        }

        if (body.supplierUuid) {
            if (!supplier) throw new AppError(ErrorCodes.SUPPLIER.NOT_FOUND, undefined, undefined, { uuid: body.supplierUuid });
            if (supplier.status === SupplierStatus.ARCHIVED && existingSupplierUuid !== supplier.uuid) {
                throw new AppError(ErrorCodes.SUPPLIER.ARCHIVED, undefined, undefined, { uuid: supplier.uuid });
            }
        }

        if (!receiverExists) throw new AppError(ErrorCodes.USER.NOT_FOUND, undefined, undefined, { uuid: body.receiverUuid, companyUuid });

        return linesByRecipe;
    }

    private static headerFields(body: StockOutBody) {
        return {
            reason: body.reason,
            date: body.date,
            supplierUuid: body.supplierUuid,
            department: body.department,
            receiverUuid: body.receiverUuid,
            note: body.note,
        };
    }

    /** The recipe rows, each with a copy of its lines (needed = per person × persons). Returns the saved copies. */
    private static async saveRecipes(
        manager: EntityManager,
        doc: StockOut,
        body: StockOutBody,
        linesByRecipe: RecipeLinesMap,
    ): Promise<StockOutRecipeLine[]> {
        if (!body.recipes.length) return [];
        const rows = await manager.save(body.recipes.map((row, index) => manager.create(StockOutRecipe, {
            ...row,
            stockOutUuid: doc.uuid,
            companyUuid: doc.companyUuid,
            position: index + 1,
        })));
        return manager.save(rows.flatMap((row) => linesByRecipe.get(row.recipeUuid)!.map((line) => manager.create(StockOutRecipeLine, {
            stockOutRecipeUuid: row.uuid,
            companyUuid: doc.companyUuid,
            productUuid: line.productUuid,
            position: line.position,
            quantity: line.quantity,
            neededQuantity: Number((line.quantity * row.persons).toFixed(RECIPE_QUANTITY_DECIMALS)),
            date: doc.date,
        }))));
    }

    /** Recipe needs summed per product, as K sums them. */
    private static neededByProduct(recipeLines: Pick<StockOutRecipeLine, "productUuid" | "neededQuantity">[]): Map<string, number> {
        const needed = new Map<string, number>();
        for (const line of recipeLines) {
            needed.set(line.productUuid, Number(((needed.get(line.productUuid) ?? 0) + line.neededQuantity).toFixed(RECIPE_QUANTITY_DECIMALS)));
        }
        return needed;
    }

    /** The doc's lines that count in K - none unless it went to the kitchen. */
    private static async kitchenLines(manager: EntityManager, doc: Pick<StockOut, "uuid" | "department">): Promise<StockOutLine[]> {
        if (!KITCHEN_BALANCE_ENABLED || doc.department !== StockOutDepartment.KITCHEN) return [];
        return manager.find(StockOutLine, { where: { stockOutUuid: doc.uuid } });
    }

    /**
     * Locks the products, saves the lines and recipe rows, then checks a return against its supplier, the stock (S)
     * and the kitchen balance (K). The document's own quantities turn the new sums back into what was available to it.
     * `previousKitchenProducts` (edit) are the products the old version gave the kitchen - removing them may take K below 0.
     */
    private static async saveLinesChecked(
        manager: EntityManager,
        doc: StockOut,
        body: StockOutBody,
        linesByRecipe: RecipeLinesMap,
        previousKitchenProducts: string[] = [],
    ): Promise<void> {
        const quantities = StockService.addQuantities(new Map(), body.lines, 1);
        await StockService.lockProducts(manager, doc.companyUuid, [...new Set([...quantities.keys(), ...previousKitchenProducts])]);
        await manager.save(body.lines.map((line, index) => manager.create(StockOutLine, {
            ...line,
            stockOutUuid: doc.uuid,
            companyUuid: doc.companyUuid,
            department: doc.department,
            date: doc.date,
            position: index + 1,
        })));
        const recipeLines = await StockOutService.saveRecipes(manager, doc, body, linesByRecipe);
        if (doc.reason === StockOutReason.RETURNED && doc.supplierUuid) {
            await SupplierReturnService.assertReturnFits(manager, doc.companyUuid, doc.supplierUuid, doc.uuid, quantities);
        }
        await StockService.assertNotNegative(manager, doc.companyUuid, quantities);

        if (!KITCHEN_BALANCE_ENABLED) return;
        // K + this doc's total ≥ its recipe needs, i.e. K after the save is not below 0.
        const kitchenAddBack = new Map(previousKitchenProducts.map((uuid) => [uuid, 0]));
        if (doc.department === StockOutDepartment.KITCHEN) {
            const needed = StockOutService.neededByProduct(recipeLines);
            for (const line of body.lines) kitchenAddBack.set(line.productUuid, needed.get(line.productUuid) ?? 0);
        }
        await StockService.assertKitchenNotNegative(manager, doc.companyUuid, kitchenAddBack);
    }

    /** Product counts, supplier, receiver and creator names for a page of headers, by bounded lookups instead of joins. */
    private async toHeaders(docs: StockOut[]): Promise<IStockOut[]> {
        if (!docs.length) return [];
        const supplierUuids = [...new Set(docs.map((d) => d.supplierUuid).filter((uuid): uuid is string => !!uuid))];
        const userUuids = [...new Set(docs.flatMap((d) => [d.createdByUuid, d.receiverUuid]).filter((uuid): uuid is string => !!uuid))];

        const docUuids = docs.map((d) => d.uuid);
        const [counts, withRecipes, suppliers, users] = await Promise.all([
            this.lineRepo.createQueryBuilder("line")
                .select("line.stockOutUuid", "stockOutUuid")
                .addSelect("COUNT(DISTINCT line.productUuid)", "productCount")
                .where("line.stockOutUuid IN (:...uuids)", { uuids: docUuids })
                .groupBy("line.stockOutUuid")
                .getRawMany<{ stockOutUuid: string; productCount: string }>(),
            this.outRecipeRepo.createQueryBuilder("row")
                .select("DISTINCT row.stockOutUuid", "stockOutUuid")
                .where("row.stockOutUuid IN (:...uuids)", { uuids: docUuids })
                .getRawMany<{ stockOutUuid: string }>(),
            supplierUuids.length ? this.supplierRepo.find({ where: { uuid: In(supplierUuids) } }) : [],
            this.userRepo.find({ where: { uuid: In(userUuids) } }),
        ]);

        const countMap = new Map(counts.map((c) => [c.stockOutUuid, Number(c.productCount)]));
        const recipeDocs = new Set(withRecipes.map((r) => r.stockOutUuid));
        const supplierMap = new Map(suppliers.map((s) => [s.uuid, s.name]));
        const userMap = new Map(users.map((u) => [u.uuid, u]));

        return docs.map((doc) => ({
            uuid: doc.uuid,
            number: formatDocumentNumber(STOCK_OUT_NUMBER_PREFIX, doc.year, doc.number),
            reason: doc.reason,
            date: doc.date.toISOString(),
            supplier: doc.supplierUuid ? { uuid: doc.supplierUuid, name: supplierMap.get(doc.supplierUuid) ?? "" } : null,
            department: doc.department,
            receiver: doc.receiverUuid ? { uuid: doc.receiverUuid, name: userName(userMap.get(doc.receiverUuid)) } : null,
            note: doc.note,
            productCount: countMap.get(doc.uuid) ?? 0,
            hasRecipes: recipeDocs.has(doc.uuid),
            createdBy: { uuid: doc.createdByUuid, name: userName(userMap.get(doc.createdByUuid)) },
            createdAt: doc.createdAt.toISOString(),
        }));
    }

    /** The same filters for the list and its summary, so the two always match. */
    private filtered(companyUuid: string, filters: StockOutFilters): SelectQueryBuilder<StockOut> {
        const { reason, supplierUuid, receiverUuid, dateFrom, dateTo } = filters;
        const qb = this.repo.createQueryBuilder("doc").where("doc.companyUuid = :companyUuid", { companyUuid });
        if (reason) qb.andWhere("doc.reason = :reason", { reason });
        if (supplierUuid) qb.andWhere("doc.supplierUuid = :supplierUuid", { supplierUuid });
        if (receiverUuid) qb.andWhere("doc.receiverUuid = :receiverUuid", { receiverUuid });
        if (dateFrom) qb.andWhere("doc.date >= :dateFrom", { dateFrom: new Date(dateFrom) });
        if (dateTo) qb.andWhere("doc.date <= :dateTo", { dateTo: new Date(dateTo) });
        return qb;
    }

    async summary(companyUuid: string, filters: StockOutFilters): Promise<IStockOutSummary> {
        const row = await this.filtered(companyUuid, filters)
            .leftJoin(StockOutLine, "line", "line.stockOutUuid = doc.uuid")
            .select("COUNT(DISTINCT doc.uuid)", "documentCount")
            .addSelect("COUNT(DISTINCT line.productUuid)", "productCount")
            .getRawOne<{ documentCount: string; productCount: string }>();

        return {
            documentCount: Number(row?.documentCount ?? 0),
            productCount: Number(row?.productCount ?? 0),
        };
    }

    /** Every document for these filters, newest first like the list - the Excel file. */
    async listAll(companyUuid: string, filters: StockOutFilters): Promise<IStockOut[]> {
        assertExportRows(await this.filtered(companyUuid, filters).getCount());
        const docs = await this.filtered(companyUuid, filters)
            .orderBy("doc.date", "DESC")
            .addOrderBy("doc.createdAt", "DESC")
            .getMany();
        return this.toHeaders(docs);
    }

    async list(companyUuid: string, query: StockOutsQuery): Promise<{ items: IStockOut[]; meta: IPaginationMeta }> {
        const { page, pageSize } = query;

        const [rows, total] = await this.filtered(companyUuid, query)
            .orderBy("doc.date", "DESC")
            .addOrderBy("doc.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: await this.toHeaders(rows),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    /** The saved recipe rows and their copied lines - never the current recipes, so a later recipe edit changes nothing here. */
    async get(companyUuid: string, uuid: string): Promise<IStockOutDetails> {
        const doc = await this.findOrFail(companyUuid, uuid);
        const [lines, rows] = await Promise.all([
            this.lineRepo.find({ where: { stockOutUuid: doc.uuid }, order: { position: "ASC" } }),
            this.outRecipeRepo.find({ where: { stockOutUuid: doc.uuid }, order: { position: "ASC" } }),
        ]);
        const [recipeLines, recipes] = rows.length
            ? await Promise.all([
                this.outRecipeLineRepo.find({ where: { stockOutRecipeUuid: In(rows.map((r) => r.uuid)) }, order: { position: "ASC" } }),
                this.recipeRepo.find({ where: { uuid: In(rows.map((r) => r.recipeUuid)) } }),
            ])
            : [[], []];
        const productUuids = [...new Set([...lines, ...recipeLines].map((l) => l.productUuid))];

        const [[header], products] = await Promise.all([
            this.toHeaders([doc]),
            productUuids.length
                ? this.productRepo.find({ where: { uuid: In(productUuids) } })
                : [],
        ]);
        const productMap = new Map(products.map((p) => [p.uuid, p]));
        const recipeNames = new Map(recipes.map((r) => [r.uuid, r.name]));
        const productOf = (productUuid: string) => StockService.toLineProduct(productMap.get(productUuid)!);

        const needed = StockOutService.neededByProduct(recipeLines);

        return {
            ...header!,
            recipes: rows.map((row): IStockOutRecipe => ({
                uuid: row.uuid,
                recipe: { uuid: row.recipeUuid, name: recipeNames.get(row.recipeUuid) ?? "" },
                persons: row.persons,
                lines: recipeLines.filter((line) => line.stockOutRecipeUuid === row.uuid).map((line) => ({
                    uuid: line.uuid,
                    product: productOf(line.productUuid),
                    quantity: line.quantity,
                    neededQuantity: line.neededQuantity,
                })),
            })),
            lines: lines.map((line): IStockOutLine => ({
                uuid: line.uuid,
                product: productOf(line.productUuid),
                quantity: line.quantity,
                extraQuantity: line.extraQuantity,
                neededQuantity: needed.get(line.productUuid) ?? 0,
            })),
        };
    }

    /** Any company user, those without login included - sorted Active -> Blocked -> Archived (the status values go up in that order). */
    async receivers(companyUuid: string): Promise<IStockOutReceiver[]> {
        const users = await this.userRepo.find({
            where: { companyUuid },
            order: { status: "ASC", firstName: "ASC", lastName: "ASC" },
        });
        return users.map((user) => ({ uuid: user.uuid, name: userName(user), position: user.position, status: user.status }));
    }

    async create(companyUuid: string, userUuid: string, body: StockOutBody): Promise<IStockOutDetails> {
        const linesByRecipe = await this.assertReferences(companyUuid, body, null);

        const uuid = await saveNumberedDocument(StockOut, companyUuid, async (manager, year, number) => {
            const doc = await manager.save(manager.create(StockOut, {
                ...StockOutService.headerFields(body),
                companyUuid,
                year,
                number,
                createdByUuid: userUuid,
            }));
            await StockOutService.saveLinesChecked(manager, doc, body, linesByRecipe);
            return doc.uuid;
        });
        return this.get(companyUuid, uuid);
    }

    /** Each recipe row of the document with its saved per-person lines, by recipe uuid. */
    private async savedRecipeLines(stockOutUuid: string): Promise<RecipeLinesMap> {
        const rows = await this.outRecipeRepo.find({ where: { stockOutUuid } });
        if (!rows.length) return new Map();
        const lines = await this.outRecipeLineRepo.find({ where: { stockOutRecipeUuid: In(rows.map((r) => r.uuid)) }, order: { position: "ASC" } });
        return new Map(rows.map((row) => [row.recipeUuid, lines.filter((line) => line.stockOutRecipeUuid === row.uuid)]));
    }

    /**
     * Lines and recipe rows are replaced as a whole. Only the new lines' products need the check - the old ones only get stock back.
     * Recipe rows already in the document are rebuilt from their saved copy; new rows copy the current recipe.
     */
    async update(companyUuid: string, userUuid: string, uuid: string, body: StockOutBody): Promise<IStockOutDetails> {
        const doc = await this.findOwnOrFail(companyUuid, uuid, userUuid);
        const linesByRecipe = await this.assertReferences(companyUuid, body, doc.supplierUuid, await this.savedRecipeLines(doc.uuid));

        await AppDataSource.transaction(async (manager) => {
            const previousKitchenProducts = (await StockOutService.kitchenLines(manager, doc)).map((line) => line.productUuid);
            Object.assign(doc, StockOutService.headerFields(body));
            await manager.save(doc);
            await manager.delete(StockOutLine, { stockOutUuid: doc.uuid });
            await manager.delete(StockOutRecipe, { stockOutUuid: doc.uuid });
            await StockOutService.saveLinesChecked(manager, doc, body, linesByRecipe, previousKitchenProducts);
        });

        return this.get(companyUuid, uuid);
    }

    /**
     * No stock check - deleting a stock-out only gives stock back. A kitchen doc takes its part out of K, which a
     * later doc may already have used, so K is checked.
     */
    async delete(companyUuid: string, userUuid: string, uuid: string): Promise<void> {
        const doc = await this.findOwnOrFail(companyUuid, uuid, userUuid);
        await AppDataSource.transaction(async (manager) => {
            const lines = await StockOutService.kitchenLines(manager, doc);
            if (lines.length) await StockService.lockProducts(manager, companyUuid, lines.map((line) => line.productUuid));
            const recipeLines = lines.length
                ? await manager.createQueryBuilder(StockOutRecipeLine, "line")
                    .innerJoin(StockOutRecipe, "row", "row.uuid = line.stockOutRecipeUuid")
                    .where("row.stockOutUuid = :uuid", { uuid: doc.uuid })
                    .getMany()
                : [];
            await manager.remove(doc);

            // What the doc added to K, so the error shows K as it was before the delete.
            const needed = StockOutService.neededByProduct(recipeLines);
            const kitchenAddBack = new Map(lines.map((line) => [line.productUuid, line.quantity - (needed.get(line.productUuid) ?? 0)]));
            await StockService.assertKitchenNotNegative(manager, companyUuid, kitchenAddBack);
        });
    }
}
