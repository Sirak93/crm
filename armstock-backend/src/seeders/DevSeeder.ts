import { DefaultRole } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { Company } from "../models/Company";
import { Role } from "../models/Role";
import { User } from "../models/User";
import { DEFAULT_ROLE_NAMES } from "../constants/DefaultRoles";
import { requireEnv } from "../utils/requireEnv";
import { PlatformCompaniesService } from "../services/platform/PlatformCompaniesService";
import { CompanyUsersService } from "../services/CompanyUsersService";
import { findByName, seedSampleProducts, seedSampleRecipes, seedSampleSuppliers } from "./SampleCatalog";

const DEMO_COMPANY_NAME = "Armstock Demo";

const ENV = {
    PASSWORD: "DEV_SEED_PASSWORD",
    OWNER_EMAIL: "DEV_SEED_OWNER_EMAIL",
    STOREKEEPER_EMAIL: "DEV_SEED_STOREKEEPER_EMAIL",
    ACCOUNTANT_EMAIL: "DEV_SEED_ACCOUNTANT_EMAIL",
    CHEF_EMAIL: "DEV_SEED_CHEF_EMAIL",
} as const;

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
        }, false, []);

    await member("Գոռ", "Սարգսյան", "Պահեստապետ", DEFAULT_ROLE_NAMES[DefaultRole.STOREKEEPER], env("STOREKEEPER_EMAIL"));
    await member("Անի", "Հակոբյան", "Հաշվապահ", DEFAULT_ROLE_NAMES[DefaultRole.ACCOUNTANT], env("ACCOUNTANT_EMAIL"));
    await member("Արմեն", "Ավետիսյան", "Շեֆ-խոհարար", DEFAULT_ROLE_NAMES[DefaultRole.CHEF], env("CHEF_EMAIL"));
    await member("Կարեն", "Գրիգորյան", "Խոհարար", DEFAULT_ROLE_NAMES[DefaultRole.STAFF], null);

    const productCount = await seedSampleProducts(companyUuid);
    const supplierCount = await seedSampleSuppliers(companyUuid);
    const recipeCount = await seedSampleRecipes(companyUuid);

    const userCount = await AppDataSource.getRepository(User).count({ where: { companyUuid } });
    console.log(`"${DEMO_COMPANY_NAME}" created: ${userCount} users, ${productCount} products, ${supplierCount} suppliers, ${recipeCount} recipes`);
};
