import { In, type EntityManager, type SelectQueryBuilder } from "typeorm";
import {
    ErrorCodes,
    SupplierStatus,
    type IPaginationMeta,
    type IStockOut,
    type IStockOutDetails,
    type IStockOutLine,
    type IStockOutReceiver,
    type IStockOutSummary,
} from "armstock-shared";
import { AppDataSource } from "../config/database";
import { StockOut } from "../models/StockOut";
import { StockOutLine } from "../models/StockOutLine";
import { Product } from "../models/Product";
import { Supplier } from "../models/Supplier";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { formatDocumentNumber, saveNumberedDocument } from "../utils/documentNumber";
import { userName } from "../utils/userName";
import { StockService } from "./StockService";
import type { StockOutBody, StockOutFilters, StockOutsQuery } from "../schemas/StockOutSchema";

const NUMBER_PREFIX = "OUT";

export class StockOutService {
    private repo = AppDataSource.getRepository(StockOut);
    private lineRepo = AppDataSource.getRepository(StockOutLine);
    private productRepo = AppDataSource.getRepository(Product);
    private supplierRepo = AppDataSource.getRepository(Supplier);
    private userRepo = AppDataSource.getRepository(User);

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
     * Products, supplier and receiver must be the company's. Archived products need no check here:
     * one at 0 fails the stock check. The supplier must be active unless the document already had it.
     */
    private async assertReferences(companyUuid: string, body: StockOutBody, existingSupplierUuid: string | null): Promise<void> {
        const productUuids = [...new Set(body.lines.map((line) => line.productUuid))];
        const [products, supplier, receiverExists] = await Promise.all([
            this.productRepo.find({ where: { uuid: In(productUuids), companyUuid }, relations: { measureUnit: true } }),
            body.supplierUuid ? this.supplierRepo.findOne({ where: { uuid: body.supplierUuid, companyUuid } }) : null,
            body.receiverUuid ? this.userRepo.exists({ where: { uuid: body.receiverUuid, companyUuid } }) : true,
        ]);

        const productMap = new Map(products.map((p) => [p.uuid, p]));
        for (const line of body.lines) {
            const product = productMap.get(line.productUuid);
            if (!product) throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND, undefined, undefined, { uuid: line.productUuid });
            StockService.assertQuantityFitsUnit(product, line.quantity);
        }

        if (body.supplierUuid) {
            if (!supplier) throw new AppError(ErrorCodes.SUPPLIER.NOT_FOUND, undefined, undefined, { uuid: body.supplierUuid });
            if (supplier.status === SupplierStatus.ARCHIVED && existingSupplierUuid !== supplier.uuid) {
                throw new AppError(ErrorCodes.SUPPLIER.ARCHIVED, undefined, undefined, { uuid: supplier.uuid });
            }
        }

        if (!receiverExists) throw new AppError(ErrorCodes.USER.NOT_FOUND, undefined, undefined, { uuid: body.receiverUuid, companyUuid });
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

    /** Locks the products, saves the lines, then checks stock - the new quantities turn the new total into what was available. */
    private static async saveLinesChecked(manager: EntityManager, doc: StockOut, body: StockOutBody): Promise<void> {
        const addBack = StockService.addQuantities(new Map(), body.lines, 1);
        await StockService.lockProducts(manager, doc.companyUuid, [...addBack.keys()]);
        await manager.save(body.lines.map((line, index) => manager.create(StockOutLine, {
            ...line,
            stockOutUuid: doc.uuid,
            companyUuid: doc.companyUuid,
            position: index + 1,
        })));
        await StockService.assertNotNegative(manager, doc.companyUuid, addBack);
    }

    /** Product counts, supplier, receiver and creator names for a page of headers, by bounded lookups instead of joins. */
    private async toHeaders(docs: StockOut[]): Promise<IStockOut[]> {
        if (!docs.length) return [];
        const supplierUuids = [...new Set(docs.map((d) => d.supplierUuid).filter((uuid): uuid is string => !!uuid))];
        const userUuids = [...new Set(docs.flatMap((d) => [d.createdByUuid, d.receiverUuid]).filter((uuid): uuid is string => !!uuid))];

        const [counts, suppliers, users] = await Promise.all([
            this.lineRepo.createQueryBuilder("line")
                .select("line.stockOutUuid", "stockOutUuid")
                .addSelect("COUNT(DISTINCT line.productUuid)", "productCount")
                .where("line.stockOutUuid IN (:...uuids)", { uuids: docs.map((d) => d.uuid) })
                .groupBy("line.stockOutUuid")
                .getRawMany<{ stockOutUuid: string; productCount: string }>(),
            supplierUuids.length ? this.supplierRepo.find({ where: { uuid: In(supplierUuids) } }) : [],
            this.userRepo.find({ where: { uuid: In(userUuids) } }),
        ]);

        const countMap = new Map(counts.map((c) => [c.stockOutUuid, Number(c.productCount)]));
        const supplierMap = new Map(suppliers.map((s) => [s.uuid, s.name]));
        const userMap = new Map(users.map((u) => [u.uuid, u]));

        return docs.map((doc) => ({
            uuid: doc.uuid,
            number: formatDocumentNumber(NUMBER_PREFIX, doc.year, doc.number),
            reason: doc.reason,
            date: doc.date.toISOString(),
            supplierUuid: doc.supplierUuid,
            supplierName: doc.supplierUuid ? supplierMap.get(doc.supplierUuid) ?? null : null,
            department: doc.department,
            receiverUuid: doc.receiverUuid,
            receiverName: doc.receiverUuid ? userName(userMap.get(doc.receiverUuid)) : null,
            note: doc.note,
            productCount: countMap.get(doc.uuid) ?? 0,
            createdByUuid: doc.createdByUuid,
            createdByName: userName(userMap.get(doc.createdByUuid)),
            createdAt: doc.createdAt.toISOString(),
        }));
    }

    /** The same filters for the list and its summary, so the two always match. */
    private filtered(companyUuid: string, filters: StockOutFilters): SelectQueryBuilder<StockOut> {
        const { reason, supplierUuid, dateFrom, dateTo } = filters;
        const qb = this.repo.createQueryBuilder("doc").where("doc.companyUuid = :companyUuid", { companyUuid });
        if (reason) qb.andWhere("doc.reason = :reason", { reason });
        if (supplierUuid) qb.andWhere("doc.supplierUuid = :supplierUuid", { supplierUuid });
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

    async get(companyUuid: string, uuid: string): Promise<IStockOutDetails> {
        const doc = await this.findOrFail(companyUuid, uuid);
        const lines = await this.lineRepo.find({ where: { stockOutUuid: doc.uuid }, order: { position: "ASC" } });
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
            lines: lines.map((line): IStockOutLine => {
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
                };
            }),
        };
    }

    /** Any company user, Staff included - sorted Active -> Blocked -> Archived (the status values go up in that order). */
    async receivers(companyUuid: string): Promise<IStockOutReceiver[]> {
        const users = await this.userRepo.find({
            where: { companyUuid },
            order: { status: "ASC", firstName: "ASC", lastName: "ASC" },
        });
        return users.map((user) => ({ uuid: user.uuid, name: userName(user), position: user.position, status: user.status }));
    }

    async create(companyUuid: string, userUuid: string, body: StockOutBody): Promise<IStockOutDetails> {
        await this.assertReferences(companyUuid, body, null);

        const uuid = await saveNumberedDocument(StockOut, companyUuid, async (manager, year, number) => {
            const doc = await manager.save(manager.create(StockOut, {
                ...StockOutService.headerFields(body),
                companyUuid,
                year,
                number,
                createdByUuid: userUuid,
            }));
            await StockOutService.saveLinesChecked(manager, doc, body);
            return doc.uuid;
        });
        return this.get(companyUuid, uuid);
    }

    /** Lines are replaced as a whole. Only the new lines' products need the check - the old ones only get stock back. */
    async update(companyUuid: string, userUuid: string, uuid: string, body: StockOutBody): Promise<IStockOutDetails> {
        const doc = await this.findOwnOrFail(companyUuid, uuid, userUuid);
        await this.assertReferences(companyUuid, body, doc.supplierUuid);

        await AppDataSource.transaction(async (manager) => {
            Object.assign(doc, StockOutService.headerFields(body));
            await manager.save(doc);
            await manager.delete(StockOutLine, { stockOutUuid: doc.uuid });
            await StockOutService.saveLinesChecked(manager, doc, body);
        });

        return this.get(companyUuid, uuid);
    }

    /** No stock check - deleting a stock-out only gives stock back. */
    async delete(companyUuid: string, userUuid: string, uuid: string): Promise<void> {
        const doc = await this.findOwnOrFail(companyUuid, uuid, userUuid);
        await this.repo.remove(doc);
    }
}
