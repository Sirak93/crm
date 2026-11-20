import { In, type EntityManager, type SelectQueryBuilder } from "typeorm";
import {
    ErrorCodes,
    ProductStatus,
    SupplierStatus,
    type IPaginationMeta,
    type IStockIn,
    type IStockInDetails,
    type IStockInLine,
    type IStockInSummary,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { StockIn } from "../models/StockIn";
import { StockInLine } from "../models/StockInLine";
import { Product } from "../models/Product";
import { Supplier } from "../models/Supplier";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { formatDocumentNumber, isUniqueViolation } from "../utils/documentNumber";
import { StockService } from "./StockService";
import type { StockInBody, StockInFilters, StockInsQuery } from "../schemas/StockInSchema";

const NUMBER_PREFIX = "IN";
const NUMBER_ATTEMPTS = 3;

/** What the document had before an edit - archived products and supplier may stay. */
interface IExistingRefs {
    supplierUuid: string | null;
    productUuids: Set<string>;
}

const userName = (user: User | undefined): string =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "";

export class StockInService {
    private repo = AppDataSource.getRepository(StockIn);
    private lineRepo = AppDataSource.getRepository(StockInLine);
    private productRepo = AppDataSource.getRepository(Product);
    private supplierRepo = AppDataSource.getRepository(Supplier);
    private userRepo = AppDataSource.getRepository(User);

    private async findOrFail(companyUuid: string, uuid: string): Promise<StockIn> {
        const doc = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!doc) throw new AppError(ErrorCodes.STOCK_IN.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return doc;
    }

    private async findOwnOrFail(companyUuid: string, uuid: string, userUuid: string): Promise<StockIn> {
        const doc = await this.findOrFail(companyUuid, uuid);
        if (doc.createdByUuid !== userUuid) {
            throw new AppError(ErrorCodes.STOCK_IN.NOT_CREATOR, undefined, undefined, { uuid, userUuid });
        }
        return doc;
    }

    /** Products and supplier must be the company's and active - unless the document already had them. */
    private async assertReferences(companyUuid: string, body: StockInBody, existing: IExistingRefs | null): Promise<void> {
        const productUuids = [...new Set(body.lines.map((line) => line.productUuid))];
        const [products, supplier] = await Promise.all([
            this.productRepo.find({ where: { uuid: In(productUuids), companyUuid }, relations: { measureUnit: true } }),
            body.supplierUuid ? this.supplierRepo.findOne({ where: { uuid: body.supplierUuid, companyUuid } }) : null,
        ]);

        const productMap = new Map(products.map((p) => [p.uuid, p]));
        for (const line of body.lines) {
            const product = productMap.get(line.productUuid);
            if (!product) throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND, undefined, undefined, { uuid: line.productUuid });
            if (product.status === ProductStatus.ARCHIVED && !existing?.productUuids.has(product.uuid)) {
                throw new AppError(ErrorCodes.PRODUCT.ARCHIVED, undefined, undefined, { uuid: product.uuid });
            }
            if (!product.measureUnit!.allowsDecimals && !Number.isInteger(line.quantity)) {
                throw new AppError(ErrorCodes.PRODUCT.QUANTITY_NOT_WHOLE, undefined, undefined, { uuid: product.uuid, quantity: line.quantity });
            }
        }

        if (body.supplierUuid) {
            if (!supplier) throw new AppError(ErrorCodes.SUPPLIER.NOT_FOUND, undefined, undefined, { uuid: body.supplierUuid });
            if (supplier.status === SupplierStatus.ARCHIVED && existing?.supplierUuid !== supplier.uuid) {
                throw new AppError(ErrorCodes.SUPPLIER.ARCHIVED, undefined, undefined, { uuid: supplier.uuid });
            }
        }
    }

    private static headerFields(body: StockInBody) {
        return {
            reason: body.reason,
            date: body.date,
            supplierUuid: body.supplierUuid,
            invoiceNumber: body.invoiceNumber,
            note: body.note,
        };
    }

    private static async saveLines(manager: EntityManager, doc: StockIn, body: StockInBody): Promise<void> {
        await manager.save(body.lines.map((line, index) => manager.create(StockInLine, {
            ...line,
            stockInUuid: doc.uuid,
            companyUuid: doc.companyUuid,
            position: index + 1,
        })));
    }

    /** Totals, supplier and creator names for a page of headers, by bounded lookups instead of joins. */
    private async toHeaders(docs: StockIn[]): Promise<IStockIn[]> {
        if (!docs.length) return [];
        const supplierUuids = [...new Set(docs.map((d) => d.supplierUuid).filter((uuid): uuid is string => !!uuid))];
        const userUuids = [...new Set(docs.map((d) => d.createdByUuid))];

        const [totals, suppliers, users] = await Promise.all([
            this.lineRepo.createQueryBuilder("line")
                .select("line.stockInUuid", "stockInUuid")
                .addSelect("SUM(line.total)", "total")
                .addSelect("COUNT(DISTINCT line.productUuid)", "productCount")
                .where("line.stockInUuid IN (:...uuids)", { uuids: docs.map((d) => d.uuid) })
                .groupBy("line.stockInUuid")
                .getRawMany<{ stockInUuid: string; total: string; productCount: string }>(),
            supplierUuids.length ? this.supplierRepo.find({ where: { uuid: In(supplierUuids) } }) : [],
            this.userRepo.find({ where: { uuid: In(userUuids) } }),
        ]);

        const totalMap = new Map(totals.map((t) => [t.stockInUuid, t]));
        const supplierMap = new Map(suppliers.map((s) => [s.uuid, s.name]));
        const userMap = new Map(users.map((u) => [u.uuid, u]));

        return docs.map((doc) => ({
            uuid: doc.uuid,
            number: formatDocumentNumber(NUMBER_PREFIX, doc.year, doc.number),
            reason: doc.reason,
            date: doc.date.toISOString(),
            supplierUuid: doc.supplierUuid,
            supplierName: doc.supplierUuid ? supplierMap.get(doc.supplierUuid) ?? null : null,
            invoiceNumber: doc.invoiceNumber,
            note: doc.note,
            total: Number(totalMap.get(doc.uuid)?.total ?? 0),
            productCount: Number(totalMap.get(doc.uuid)?.productCount ?? 0),
            createdByUuid: doc.createdByUuid,
            createdByName: userName(userMap.get(doc.createdByUuid)),
            createdAt: doc.createdAt.toISOString(),
        }));
    }

    /** The same filters for the list and its summary, so the two always match. */
    private filtered(companyUuid: string, filters: StockInFilters): SelectQueryBuilder<StockIn> {
        const { reason, supplierUuid, dateFrom, dateTo } = filters;
        const qb = this.repo.createQueryBuilder("doc").where("doc.companyUuid = :companyUuid", { companyUuid });
        if (reason) qb.andWhere("doc.reason = :reason", { reason });
        if (supplierUuid) qb.andWhere("doc.supplierUuid = :supplierUuid", { supplierUuid });
        if (dateFrom) qb.andWhere("doc.date >= :dateFrom", { dateFrom: new Date(dateFrom) });
        if (dateTo) qb.andWhere("doc.date <= :dateTo", { dateTo: new Date(dateTo) });
        return qb;
    }

    async summary(companyUuid: string, filters: StockInFilters): Promise<IStockInSummary> {
        const row = await this.filtered(companyUuid, filters)
            .leftJoin(StockInLine, "line", "line.stockInUuid = doc.uuid")
            .select("COUNT(DISTINCT doc.uuid)", "documentCount")
            .addSelect("COUNT(DISTINCT line.productUuid)", "productCount")
            .addSelect("COALESCE(SUM(line.total), 0)", "total")
            .getRawOne<{ documentCount: string; productCount: string; total: string }>();

        return {
            documentCount: Number(row?.documentCount ?? 0),
            productCount: Number(row?.productCount ?? 0),
            total: Number(row?.total ?? 0),
        };
    }

    async list(companyUuid: string, query: StockInsQuery): Promise<{ items: IStockIn[]; meta: IPaginationMeta }> {
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

    async get(companyUuid: string, uuid: string): Promise<IStockInDetails> {
        const doc = await this.findOrFail(companyUuid, uuid);
        const lines = await this.lineRepo.find({ where: { stockInUuid: doc.uuid }, order: { position: "ASC" } });
        const productUuids = [...new Set(lines.map((l) => l.productUuid))];

        const [[header], products] = await Promise.all([
            this.toHeaders([doc]),
            productUuids.length
                ? this.productRepo.find({ where: { uuid: In(productUuids) }, relations: { measureUnit: true } })
                : [],
        ]);
        const productMap = new Map(products.map((p) => [p.uuid, p]));

        return {
            ...header!,
            lines: lines.map((line): IStockInLine => {
                const product = productMap.get(line.productUuid)!;
                return {
                    uuid: line.uuid,
                    productUuid: product.uuid,
                    productName: product.name,
                    productCode: product.code,
                    productStatus: product.status,
                    unitShortName: product.measureUnit!.shortName,
                    allowsDecimals: product.measureUnit!.allowsDecimals,
                    quantity: line.quantity,
                    price: line.price,
                    total: line.total,
                };
            }),
        };
    }

    /** The number is the company's biggest this year + 1; a clash with a parallel save retries. */
    async create(companyUuid: string, userUuid: string, body: StockInBody): Promise<IStockInDetails> {
        await this.assertReferences(companyUuid, body, null);

        for (let attempt = 1; ; attempt++) {
            try {
                const uuid = await AppDataSource.transaction(async (manager) => {
                    const year = new Date().getFullYear();
                    const { max } = await manager.createQueryBuilder(StockIn, "doc")
                        .select("MAX(doc.number)", "max")
                        .where("doc.companyUuid = :companyUuid AND doc.year = :year", { companyUuid, year })
                        .getRawOne<{ max: number | null }>() ?? { max: null };

                    const doc = await manager.save(manager.create(StockIn, {
                        ...StockInService.headerFields(body),
                        companyUuid,
                        year,
                        number: (max ?? 0) + 1,
                        createdByUuid: userUuid,
                    }));
                    await StockInService.saveLines(manager, doc, body);
                    return doc.uuid;
                });
                return this.get(companyUuid, uuid);
            } catch (error) {
                if (attempt < NUMBER_ATTEMPTS && isUniqueViolation(error)) continue;
                throw error;
            }
        }
    }

    /** Lines are replaced as a whole; stock of every product touched before or after must stay at zero or more. */
    async update(companyUuid: string, userUuid: string, uuid: string, body: StockInBody): Promise<IStockInDetails> {
        const doc = await this.findOwnOrFail(companyUuid, uuid, userUuid);
        const oldLines = await this.lineRepo.find({ where: { stockInUuid: doc.uuid } });
        const oldProductUuids = new Set(oldLines.map((l) => l.productUuid));

        await this.assertReferences(companyUuid, body, { supplierUuid: doc.supplierUuid, productUuids: oldProductUuids });

        // Old minus new quantity turns the new total back into the stock before this edit.
        const addBack = StockService.addQuantities(StockService.addQuantities(new Map(), oldLines, 1), body.lines, -1);

        await AppDataSource.transaction(async (manager) => {
            await StockService.lockProducts(manager, companyUuid, [...addBack.keys()]);
            Object.assign(doc, StockInService.headerFields(body));
            await manager.save(doc);
            await manager.delete(StockInLine, { stockInUuid: doc.uuid });
            await StockInService.saveLines(manager, doc, body);
            await StockService.assertNotNegative(manager, companyUuid, addBack);
        });

        return this.get(companyUuid, uuid);
    }

    async delete(companyUuid: string, userUuid: string, uuid: string): Promise<void> {
        const doc = await this.findOwnOrFail(companyUuid, uuid, userUuid);
        const lines = await this.lineRepo.find({ where: { stockInUuid: doc.uuid } });

        const addBack = StockService.addQuantities(new Map(), lines, 1);

        await AppDataSource.transaction(async (manager) => {
            await StockService.lockProducts(manager, companyUuid, [...addBack.keys()]);
            await manager.remove(doc);
            await StockService.assertNotNegative(manager, companyUuid, addBack);
        });
    }
}
