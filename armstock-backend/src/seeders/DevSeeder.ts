import { DefaultRole } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Company } from "../models/Company";
import { MeasureUnit } from "../models/MeasureUnit";
import { ProductCategory } from "../models/ProductCategory";
import { Role } from "../models/Role";
import { User } from "../models/User";
import { DEFAULT_ROLE_NAMES } from "../constants/DefaultRoles";
import { requireEnv } from "../utils/requireEnv";
import { PlatformCompaniesService } from "../services/platform/PlatformCompaniesService";
import { CompanyUsersService } from "../services/CompanyUsersService";
import { MeasureUnitService } from "../services/MeasureUnitService";
import { ProductCategoryService } from "../services/ProductCategoryService";
import { ProductService } from "../services/ProductService";
import { SupplierService } from "../services/SupplierService";
import extraUnits from "./data/measure-units.json";
import extraCategories from "./data/product-categories.json";
import products from "./data/products.json";
import suppliers from "./data/suppliers.json";

const DEMO_COMPANY_NAME = "Armstock Demo";

const ENV = {
    PASSWORD: "DEV_SEED_PASSWORD",
    OWNER_EMAIL: "DEV_SEED_OWNER_EMAIL",
    STOREKEEPER_EMAIL: "DEV_SEED_STOREKEEPER_EMAIL",
    ACCOUNTANT_EMAIL: "DEV_SEED_ACCOUNTANT_EMAIL",
    HR_EMAIL: "DEV_SEED_HR_EMAIL",
} as const;

const findByName = <T extends { name: string; uuid: string }>(items: T[], name: string): string => {
    const item = items.find((i) => i.name === name);
    if (!item) throw new Error(`Seed data names "${name}", which does not exist in the demo company`);
    return item.uuid;
};

/** A demo company for local development: its Owner, one user per default role, a user without login, and sample data. */
export const seedDevCompany = async () => {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("The dev seeder runs only with NODE_ENV=development");
    }
    requireEnv(...Object.values(ENV));
    const env = (name: keyof typeof ENV) => process.env[ENV[name]]!;
    const password = env("PASSWORD");

    if (await AppDataSource.getRepository(Company).exists({ where: { name: DEMO_COMPANY_NAME } })) {
        console.log(`"${DEMO_COMPANY_NAME}" already exists - drop the database to seed it again`);
        return;
    }

    const company = await new PlatformCompaniesService().create({
        name: DEMO_COMPANY_NAME,
        taxId: null,
        phone: null,
        email: null,
        address: null,
        owner: { firstName: "Արամ", lastName: "Պետրոսյան", email: env("OWNER_EMAIL").toLowerCase(), password },
    });
    const companyUuid = company.uuid;

    // The seeder acts as the Platform Owner would.
    const roles = await AppDataSource.getRepository(Role).find({ where: { companyUuid } });
    const usersService = new CompanyUsersService();
    const member = (firstName: string, lastName: string, position: string, roleName: string, email: string | null) =>
        usersService.create(companyUuid, {
            firstName,
            lastName,
            position,
            roleUuid: findByName(roles, roleName),
            canLogIn: email !== null,
            email: email?.toLowerCase() ?? null,
            password: email !== null ? password : null,
        });

    await member("Գոռ", "Սարգսյան", "Պահեստապետ", DEFAULT_ROLE_NAMES[DefaultRole.STOREKEEPER], env("STOREKEEPER_EMAIL"));
    await member("Անի", "Հակոբյան", "Հաշվապահ", DEFAULT_ROLE_NAMES[DefaultRole.ACCOUNTANT], env("ACCOUNTANT_EMAIL"));
    await member("Լիլիթ", "Մարտիրոսյան", "Կադրերի մենեջեր", DEFAULT_ROLE_NAMES[DefaultRole.HR], env("HR_EMAIL"));
    await member("Կարեն", "Գրիգորյան", "Խոհարար", DEFAULT_ROLE_NAMES[DefaultRole.STOREKEEPER], null);

    const unitService = new MeasureUnitService();
    for (const unit of extraUnits) await unitService.create(companyUuid, unit);
    const categoryService = new ProductCategoryService();
    for (const name of extraCategories) await categoryService.create(companyUuid, { name });

    const [units, categories] = await Promise.all([
        AppDataSource.getRepository(MeasureUnit).find({ where: { companyUuid } }),
        AppDataSource.getRepository(ProductCategory).find({ where: { companyUuid } }),
    ]);
    const productService = new ProductService();
    for (const product of products) {
        await productService.create(companyUuid, {
            name: product.name,
            code: null,
            measureUnitUuid: findByName(units, product.unit),
            categoryUuid: findByName(categories, product.category),
        });
    }

    const supplierService = new SupplierService();
    for (const supplier of suppliers) {
        const saved = await supplierService.create(companyUuid, { name: supplier.name, taxId: null, note: null });
        for (const contact of supplier.contacts) {
            await supplierService.addContact(companyUuid, saved.uuid, { ...contact, note: null });
        }
    }

    const userCount = await AppDataSource.getRepository(User).count({ where: { companyUuid } });
    console.log(`"${DEMO_COMPANY_NAME}" created: ${userCount} users, ${products.length} products, ${suppliers.length} suppliers`);
};
