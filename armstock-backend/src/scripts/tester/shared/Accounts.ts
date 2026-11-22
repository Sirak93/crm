import { DefaultRole, type ICompanyUser, type ILoginResponse, type Permission } from "armstock-shared";
import { PATHS } from "./Paths";
import { randomPassword, uniqueEmail, uniqueName } from "./Random";
import type { Http } from "../core/Http";
import type { ITestCompany } from "../interfaces/ITestCompany";
import type { ITestUser } from "../interfaces/ITestUser";

export const login = async (anonymous: Http, email: string, password: string): Promise<ITestUser> => {
    const { data } = await anonymous.ok<ILoginResponse>("POST", PATHS.LOGIN, { email, password });
    return { uuid: data.user.uuid, email, password, token: data.token, api: anonymous.withToken(data.token) };
};

interface IMemberOptions {
    /** Exactly the permissions the user gets (the Owner adds them, so the role's set is not copied). */
    permissions: Permission[];
    role?: DefaultRole;
    label?: string;
}

/** A logged-in company member with exactly the given permissions - added by the company's Owner. */
export const createMember = async (company: ITestCompany, { permissions, role = DefaultRole.STAFF, label = "member" }: IMemberOptions): Promise<ITestUser> => {
    const email = uniqueEmail(label);
    const password = randomPassword();
    await company.owner.api.ok<ICompanyUser>("POST", PATHS.COMPANY_USERS, {
        firstName: uniqueName("Tester"),
        lastName: label,
        canLogIn: true,
        email,
        password,
        roleUuid: company.roles[role],
        permissions,
    });
    return login(company.owner.api.withToken(null), email, password);
};

/** A company user without login - can still be a stock-out receiver. */
export const createNoLoginUser = async (company: ITestCompany): Promise<ICompanyUser> => {
    const { data } = await company.owner.api.ok<ICompanyUser>("POST", PATHS.COMPANY_USERS, {
        firstName: uniqueName("Receiver"),
        lastName: "No login",
        canLogIn: false,
        roleUuid: company.roles[DefaultRole.STAFF],
    });
    return data;
};
