import bcrypt from "bcrypt";
import type { EntityManager } from "typeorm";
import { ErrorCodes, type IStaffLogin } from "armstock-shared";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { BCRYPT_ROUNDS } from "../constants/AuthConstants";
import type { ICreateLogin } from "../interfaces/ICreateLogin";

export class UserService {
    static toStaffLogin(user: User): IStaffLogin {
        return {
            uuid: user.uuid,
            email: user.email,
            role: user.role,
            status: user.status,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        };
    }

    /** Runs inside the caller's transaction. */
    static async createLogin(manager: EntityManager, data: ICreateLogin): Promise<User> {
        const repo = manager.getRepository(User);
        if (await repo.exists({ where: { email: data.email } })) {
            throw new AppError(ErrorCodes.USER.EMAIL_TAKEN);
        }

        return repo.save(repo.create({
            email: data.email,
            password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
            role: data.role,
            companyUuid: data.companyUuid,
            staffUuid: data.staffUuid,
        }));
    }
}
