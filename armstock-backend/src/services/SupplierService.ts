import { In } from "typeorm";
import { ErrorCodes, SupplierStatus, type IPaginationMeta, type ISupplier, type ISupplierContact } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Supplier } from "../models/Supplier";
import { SupplierContact } from "../models/SupplierContact";
import { AppError } from "../utils/AppError";
import type { SupplierBody, SupplierContactBody, SuppliersQuery } from "../schemas/SupplierSchema";

export class SupplierService {
    private repo = AppDataSource.getRepository(Supplier);
    private contactRepo = AppDataSource.getRepository(SupplierContact);

    private static toContact(contact: SupplierContact): ISupplierContact {
        return { uuid: contact.uuid, name: contact.name, position: contact.position, phone: contact.phone, note: contact.note };
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

    /** The supplier is checked first, so a contact of another company's supplier is never reached. */
    private async findContactOrFail(companyUuid: string, supplierUuid: string, uuid: string): Promise<SupplierContact> {
        await this.findOrFail(companyUuid, supplierUuid);
        const contact = await this.contactRepo.findOne({ where: { uuid, supplierUuid } });
        if (!contact) throw new AppError(ErrorCodes.SUPPLIER_CONTACT.NOT_FOUND, undefined, undefined, { uuid, supplierUuid });
        return contact;
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
        const supplier = await this.repo.save(this.repo.create({ ...body, companyUuid }));
        return SupplierService.toSupplier(supplier, []);
    }

    async update(companyUuid: string, uuid: string, body: SupplierBody): Promise<ISupplier> {
        const [supplier] = await Promise.all([
            this.findOrFail(companyUuid, uuid),
            this.assertNameFree(companyUuid, body.name, uuid),
        ]);
        Object.assign(supplier, body);
        await this.repo.save(supplier);
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

    async addContact(companyUuid: string, supplierUuid: string, body: SupplierContactBody): Promise<ISupplierContact> {
        await this.findOrFail(companyUuid, supplierUuid);
        return SupplierService.toContact(await this.contactRepo.save(this.contactRepo.create({ ...body, supplierUuid })));
    }

    async updateContact(companyUuid: string, supplierUuid: string, uuid: string, body: SupplierContactBody): Promise<ISupplierContact> {
        const contact = await this.findContactOrFail(companyUuid, supplierUuid, uuid);
        Object.assign(contact, body);
        return SupplierService.toContact(await this.contactRepo.save(contact));
    }

    async deleteContact(companyUuid: string, supplierUuid: string, uuid: string): Promise<void> {
        await this.contactRepo.remove(await this.findContactOrFail(companyUuid, supplierUuid, uuid));
    }
}
