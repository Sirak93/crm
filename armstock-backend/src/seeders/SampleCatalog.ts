import { MeasureUnit, ProductReceivedAs } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Product } from "../models/Product";
import { ProductCategory } from "../models/ProductCategory";
import { Supplier } from "../models/Supplier";
import { ProductService } from "../services/ProductService";
import { SupplierService } from "../services/SupplierService";
import products from "./data/products.json";
import suppliers from "./data/suppliers.json";

export const findByName = <T extends { name: string; uuid: string }>(items: T[], name: string): string => {
    const item = items.find((i) => i.name === name);
    if (!item) throw new Error(`Seed data names "${name}", which does not exist in the company`);
    return item.uuid;
};

/** Adds the sample products the company does not have yet (by name). Returns how many were added. */
export const seedSampleProducts = async (companyUuid: string): Promise<number> => {
    const [categories, existing] = await Promise.all([
        AppDataSource.getRepository(ProductCategory).find({ where: { companyUuid } }),
        AppDataSource.getRepository(Product).find({ where: { companyUuid } }),
    ]);
    const names = new Set(existing.map((p) => p.name));
    const productService = new ProductService();
    let added = 0;
    for (const product of products.filter((p) => !names.has(p.name))) {
        await productService.create(companyUuid, {
            name: product.name,
            code: null,
            barcode: null,
            measureUnit: MeasureUnit[product.unit as keyof typeof MeasureUnit],
            receivedAs: product.receivedAs
                ? ProductReceivedAs[product.receivedAs as keyof typeof ProductReceivedAs]
                : ProductReceivedAs.LOOSE,
            categoryUuid: findByName(categories, product.category),
        });
        added++;
    }
    return added;
};

/** Adds the sample suppliers (with contacts) the company does not have yet (by name). Returns how many were added. */
export const seedSampleSuppliers = async (companyUuid: string): Promise<number> => {
    const existing = await AppDataSource.getRepository(Supplier).find({ where: { companyUuid } });
    const names = new Set(existing.map((s) => s.name));
    const supplierService = new SupplierService();
    let added = 0;
    for (const supplier of suppliers.filter((s) => !names.has(s.name))) {
        const saved = await supplierService.create(companyUuid, { name: supplier.name, taxId: null, note: null });
        for (const contact of supplier.contacts) {
            await supplierService.addContact(companyUuid, saved.uuid, { ...contact, note: null });
        }
        added++;
    }
    return added;
};
