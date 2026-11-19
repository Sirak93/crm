import { In, type EntityManager } from "typeorm";
import { ErrorCodes, SupplierStatus, type IPaginationMeta, type ISupplier, type ISupplierContact } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Supplier } from "../models/Supplier";
import { SupplierContact } from "../models/SupplierContact";
import { AppError } from "../utils/AppError";
import type { SupplierBody, SuppliersQuery } from "../schemas/SupplierSchema";

export class SupplierService {
    private repo = AppDataSource.getRepository(Supplier);
    private contactRepo = AppDataSource.getRepository(SupplierContact);

    private static toContact(contact: SupplierContact): ISupplierContact {
        return { uuid: contact.uuid, name: contact.name, position: contact.position, phone: contact.phone };
    }

    private static toSupplier(supplier: Supplier, contacts: SupplierContact[]): ISupplier {
        return {
            uuid: supplier.uuid,
            name: supplier.name,
            taxId: supplier.taxId,
            note: supplier.note,
            status: supplier.status,
            contacts: contacts.map(SupplierService.toContact),
            createdAt: supplier.createdAt.toISOString(),
        };
    }

    private async findOrFail(companyUuid: string, uuid: string): Promise<Supplier> {
        const supplier = await this.repo.findOne({ where: { uuid, companyUuid } });
        if (!supplier) throw new AppError(ErrorCodes.SUPPLIER.NOT_FOUND, undefined, undefined, { uuid, companyUuid });
        return supplier;
    }

    /** Unique inside the company, ignoring case - archived suppliers count too. */
    private async assertNameFree(companyUuid: string, name: string, exceptUuid?: string): Promise<void> {
        const qb = this.repo.createQueryBuilder("supplier")
            .where("supplier.companyUuid = :companyUuid", { companyUuid })
            .andWhere("LOWER(supplier.name) = LOWER(:name)", { name });
        if (exceptUuid) qb.andWhere("supplier.uuid != :exceptUuid", { exceptUuid });
        if (await qb.getExists()) throw new AppError(ErrorCodes.SUPPLIER.NAME_TAKEN);
    }

    /** Contacts of one page, by a bounded `uuid IN (...)` lookup instead of a join on the paginated query. */
    private async withContacts(suppliers: Supplier[]): Promise<ISupplier[]> {
        if (!suppliers.length) return [];
        const contacts = await this.contactRepo.find({
            where: { supplierUuid: In(suppliers.map((s) => s.uuid)) },
            order: { name: "ASC" },
        });
        const bySupplier = new Map<string, SupplierContact[]>();
        for (const contact of contacts) {
            bySupplier.set(contact.supplierUuid, [...(bySupplier.get(contact.supplierUuid) ?? []), contact]);
        }
        return suppliers.map((s) => SupplierService.toSupplier(s, bySupplier.get(s.uuid) ?? []));
    }

    /** The sent list replaces the saved contacts. Runs inside the caller's transaction. */
    private static async replaceContacts(manager: EntityManager, supplierUuid: string, contacts: SupplierBody["contacts"]): Promise<void> {
        const repo = manager.getRepository(SupplierContact);
        await repo.delete({ supplierUuid });
        if (contacts.length) await repo.save(contacts.map((c) => repo.create({ ...c, supplierUuid })));
    }

    async list(companyUuid: string, query: SuppliersQuery): Promise<{ items: ISupplier[]; meta: IPaginationMeta }> {
        const { page, pageSize, search, status } = query;

        const qb = this.repo.createQueryBuilder("supplier").where("supplier.companyUuid = :companyUuid", { companyUuid });
        if (search) qb.andWhere("supplier.name ILIKE :search", { search: `%${search}%` });
        if (status) qb.andWhere("supplier.status = :status", { status });

        const [rows, total] = await qb
            .orderBy("supplier.name", "ASC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: await this.withContacts(rows),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async create(companyUuid: string, body: SupplierBody): Promise<ISupplier> {
        await this.assertNameFree(companyUuid, body.name);
        const { contacts, ...fields } = body;
        const supplier = await AppDataSource.transaction(async (manager) => {
            const repo = manager.getRepository(Supplier);
            const saved = await repo.save(repo.create({ ...fields, companyUuid }));
            await SupplierService.replaceContacts(manager, saved.uuid, contacts);
            return saved;
        });
        const [item] = await this.withContacts([supplier]);
        return item!;
    }

    async update(companyUuid: string, uuid: string, body: SupplierBody): Promise<ISupplier> {
        const [supplier] = await Promise.all([
            this.findOrFail(companyUuid, uuid),
            this.assertNameFree(companyUuid, body.name, uuid),
        ]);
        const { contacts, ...fields } = body;
        Object.assign(supplier, fields);
        await AppDataSource.transaction(async (manager) => {
            await manager.getRepository(Supplier).save(supplier);
            await SupplierService.replaceContacts(manager, uuid, contacts);
        });
        const [item] = await this.withContacts([supplier]);
        return item!;
    }

    async setStatus(companyUuid: string, uuid: string, status: SupplierStatus): Promise<ISupplier> {
        const supplier = await this.findOrFail(companyUuid, uuid);
        supplier.status = status;
        await this.repo.save(supplier);
        const [item] = await this.withContacts([supplier]);
        return item!;
    }

    /** Contacts go with it (FK cascade). The "used by a stock-in document" check comes with stock-in. */
    async delete(companyUuid: string, uuid: string): Promise<void> {
        await this.repo.remove(await this.findOrFail(companyUuid, uuid));
    }
}
