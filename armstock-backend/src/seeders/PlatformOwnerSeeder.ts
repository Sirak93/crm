import bcrypt from "bcrypt";
import { AccountType } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { BCRYPT_ROUNDS } from "../constants/AuthConstants";

export const seedPlatformOwner = async () => {
    const email = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
    const password = process.env.PLATFORM_OWNER_PASSWORD;

    if (!email || !password) {
        throw new Error("PLATFORM_OWNER_EMAIL and PLATFORM_OWNER_PASSWORD must be set to seed the platform owner");
    }

    const userRepo = AppDataSource.getRepository(User);
    const existing = await userRepo.findOne({ where: { accountType: AccountType.PLATFORM_OWNER } });

    if (existing) {
        console.log(`Platform owner already exists: ${existing.email}`);
        return;
    }

    const owner = userRepo.create({
        email,
        password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        accountType: AccountType.PLATFORM_OWNER,
    });
    await userRepo.save(owner);
    console.log(`Platform owner created: ${owner.email}`);
};
