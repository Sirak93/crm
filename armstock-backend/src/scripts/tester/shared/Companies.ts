import { DEFAULT_ROLE_PERMISSIONS, DefaultRole, type ICompany, type IRole } from "armstock-shared";
import { DEFAULT_ROLE_NAMES } from "../../../constants/DefaultRoles";
import { createMember, login } from "./Accounts";
import { PATHS } from "./Paths";
import { randomPassword, uniqueEmail, uniqueName } from "./Random";
import type { ITestCompany } from "../interfaces/ITestCompany";
import type { ITestContext } from "../interfaces/ITestContext";

const DEFAULT_ROLES = [DefaultRole.STOREKEEPER, DefaultRole.ACCOUNTANT, DefaultRole.HR, DefaultRole.STAFF];

/**
 * A company made through the platform API like a real onboarding, with its Owner and one
 * user per default role, each with that role's default permissions.
 */
export const createCompany = async (context: ITestContext, label: string): Promise<ITestCompany> => {
    const ownerEmail = uniqueEmail(`owner-${label}`);
    const ownerPassword = randomPassword();
    const { data: company } = await context.platformOwner.api.ok<ICompany>("POST", PATHS.PLATFORM_COMPANIES, {
        name: uniqueName(`Company ${label}`),
        owner: { firstName: "Owner", lastName: label, email: ownerEmail, password: ownerPassword },
    });
    const owner = await login(context.anonymous, ownerEmail, ownerPassword);

    const { data: roleList } = await owner.api.ok<IRole[]>("GET", PATHS.ROLES);
    const roles = {} as Record<DefaultRole, string>;
    for (const role of DEFAULT_ROLES) {
        const found = roleList.find((r) => r.name === DEFAULT_ROLE_NAMES[role]);
        if (!found) throw new Error(`company ${label} has no default role ${DEFAULT_ROLE_NAMES[role]}`);
        roles[role] = found.uuid;
    }

    const partial = { uuid: company.uuid, name: company.name, owner, roles } as ITestCompany;
    const member = (role: DefaultRole, memberLabel: string) =>
        createMember(partial, { role, permissions: [...DEFAULT_ROLE_PERMISSIONS[role]], label: `${memberLabel}-${label}` });

    const [storekeeper, accountant, hr, staff] = await Promise.all([
        member(DefaultRole.STOREKEEPER, "storekeeper"),
        member(DefaultRole.ACCOUNTANT, "accountant"),
        member(DefaultRole.HR, "hr"),
        member(DefaultRole.STAFF, "staff"),
    ]);
    return { ...partial, storekeeper, accountant, hr, staff };
};
