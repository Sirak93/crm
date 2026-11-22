import {
    AccountType,
    CompanyStatus,
    DEFAULT_ROLE_PERMISSIONS,
    DefaultRole,
    ErrorCodes,
    Permission,
    UserStatus,
    type ICompany,
    type ICompanyUser,
    type INamedRef,
} from "armstock-shared";
import { DEFAULT_ROLE_NAMES } from "../../../../constants/DefaultRoles";
import { defineSuite } from "../../core/Suite";
import { anyDate, equals, hasExactKeys, isNull, isTrue, matches } from "../../core/Assert";
import { login } from "../../shared/Accounts";
import { createCompany } from "../../shared/Companies";
import { PATHS } from "../../shared/Paths";
import { randomPassword, randomUuid, uniqueEmail, uniqueName } from "../../shared/Random";
import type { ITestCompany } from "../../interfaces/ITestCompany";
import type { ITestContext } from "../../interfaces/ITestContext";

const COMPANY_KEYS = ["uuid", "name", "taxId", "phone", "email", "address", "status", "createdAt"];

export default (context: ITestContext) => defineSuite("Platform: companies and their users", (test) => {
    const { db, anonymous, platformOwner } = context;
    const api = platformOwner.api;
    const path = (uuid: string) => `${PATHS.PLATFORM_COMPANIES}/${uuid}`;
    const usersPath = (companyUuid: string) => `${path(companyUuid)}/users`;
    const tag = uniqueName("Platform").replace(" ", "");

    const createBody = (fields: Record<string, unknown> = {}) => ({
        name: uniqueName(tag),
        owner: { firstName: "Owner", lastName: "Platform", email: uniqueEmail("platform-owner"), password: randomPassword() },
        ...fields,
    });
    let company: ITestCompany;

    // --- Companies ---

    test("create: the company, its Owner who can log in, and the default units, categories and roles", async () => {
        const body = createBody({ taxId: "01234567", phone: " ", address: "Gyumri" });
        const { data } = await api.ok<ICompany>("POST", PATHS.PLATFORM_COMPANIES, body);
        hasExactKeys(data, COMPANY_KEYS);
        matches(data, { name: body.name, taxId: "01234567", phone: isNull, address: "Gyumri", status: CompanyStatus.ACTIVE, createdAt: anyDate });

        const owner = await login(anonymous, body.owner.email, body.owner.password);
        const [row] = await db.query<{ account_type: AccountType; company_uuid: string }>(
            "SELECT account_type, company_uuid FROM users WHERE uuid = $1", [owner.uuid]);
        matches(row, { account_type: AccountType.COMPANY_OWNER, company_uuid: data.uuid });

        const count = (table: string) => db.count(table, "company_uuid = $1", [data.uuid]);
        isTrue(await count("measure_units") > 0, "default units");
        isTrue(await count("product_categories") > 0, "default categories");
        const { data: roles } = await api.ok<INamedRef[]>("GET", `${path(data.uuid)}/roles`);
        matches(roles.map((r) => r.name).sort(), Object.values(DEFAULT_ROLE_NAMES).sort(), "default roles");
    });

    test("create: bad bodies are refused, and nothing is saved", async () => {
        const before = await db.count("companies");
        const post = (field: string, fields: Record<string, unknown>) => api.rejectsField("POST", PATHS.PLATFORM_COMPANIES, field, createBody(fields));
        const owner = createBody().owner;
        await post("name", { name: " " });
        await post("email", { email: "not-an-email" });
        await post("owner", { owner: undefined });
        await post("owner.email", { owner: { ...owner, email: "nope" } });
        await post("owner.password", { owner: { ...owner, password: "short" } });
        await post("owner.firstName", { owner: { ...owner, firstName: "" } });
        equals(await db.count("companies"), before, "companies");
    });

    test("create: an Owner email already used is refused, and nothing is saved", async () => {
        company = await createCompany(context, "Platform");
        const before = await db.count("companies");
        const body = createBody();
        await api.rejects("POST", PATHS.PLATFORM_COMPANIES, ErrorCodes.USER.EMAIL_TAKEN,
            { ...body, owner: { ...body.owner, email: company.owner.email.toUpperCase() } });
        equals(await db.count("companies"), before, "companies");
    });

    test("get, edit (trimmed, empty as null, never the status) and an unknown company", async () => {
        matches((await api.ok<ICompany>("GET", path(company.uuid))).data, { uuid: company.uuid, name: company.name });
        const name = uniqueName(`${tag} Edited`);
        const { data } = await api.ok<ICompany>("PUT", path(company.uuid), { name: ` ${name} `, email: "", status: CompanyStatus.BLOCKED });
        matches(data, { name, email: isNull, status: CompanyStatus.ACTIVE });
        await api.rejectsField("PUT", path(company.uuid), "name", { name: "" });

        const unknown = randomUuid();
        await api.rejects("GET", path(unknown), ErrorCodes.COMPANY.NOT_FOUND);
        await api.rejects("PUT", path(unknown), ErrorCodes.COMPANY.NOT_FOUND, { name });
        await api.rejects("PATCH", `${path(unknown)}/status`, ErrorCodes.COMPANY.NOT_FOUND, { status: CompanyStatus.BLOCKED });
        await api.rejectsField("GET", path("nope"), "uuid");
    });

    test("block and unblock", async () => {
        const setStatus = (status: CompanyStatus) => api.ok<ICompany>("PATCH", `${path(company.uuid)}/status`, { status });
        matches((await setStatus(CompanyStatus.BLOCKED)).data, { status: CompanyStatus.BLOCKED });
        await company.owner.api.rejects("GET", PATHS.AUTH_USER, ErrorCodes.COMPANY.BLOCKED);
        matches((await setStatus(CompanyStatus.ACTIVE)).data, { status: CompanyStatus.ACTIVE });
        await company.owner.api.ok("GET", PATHS.AUTH_USER);
        await api.rejectsField("PATCH", `${path(company.uuid)}/status`, "status", { status: 999 });
    });

    test("list: newest first, search by name, paging", async () => {
        const sub = uniqueName(tag).replace(" ", "");
        const first = await api.ok<ICompany>("POST", PATHS.PLATFORM_COMPANIES, createBody({ name: `${sub} First` }));
        const second = await api.ok<ICompany>("POST", PATHS.PLATFORM_COMPANIES, createBody({ name: `${sub} Second` }));
        const { data } = await api.ok<ICompany[]>("GET", `${PATHS.PLATFORM_COMPANIES}?search=${encodeURIComponent(sub.toLowerCase())}`);
        matches(data.map((c) => c.uuid), [second.data.uuid, first.data.uuid]);

        const total = await db.count("companies");
        const page = await api.ok<ICompany[]>("GET", `${PATHS.PLATFORM_COMPANIES}?page=2&pageSize=2`);
        matches(page.meta, { page: 2, pageSize: 2, total, totalPages: Math.ceil(total / 2) });
        await api.rejectsField("GET", `${PATHS.PLATFORM_COMPANIES}?pageSize=101`, "pageSize");
    });

    // --- Their users ---

    test("users: the company's users incl. the Owner - never another company's", async () => {
        const other = await createCompany(context, "Other");
        const { data, meta } = await api.ok<ICompanyUser[]>("GET", `${usersPath(company.uuid)}?pageSize=100`);
        equals(meta.total, await db.count("users", "company_uuid = $1", [company.uuid]), "total");
        isTrue(data.some((u) => u.uuid === company.owner.uuid && u.accountType === AccountType.COMPANY_OWNER), "the Owner is listed");
        isTrue(!data.some((u) => u.uuid === other.owner.uuid), "no user of another company");
    });

    test("create a user: the role's permissions are copied, sent ones ignored", async () => {
        const email = uniqueEmail("platform-user");
        const password = randomPassword();
        const { data } = await api.ok<ICompanyUser>("POST", usersPath(company.uuid), {
            firstName: "Platform", lastName: "User", canLogIn: true, email, password,
            roleUuid: company.roles[DefaultRole.ACCOUNTANT], permissions: [Permission.COMPANY_EDIT],
        });
        matches({ ...data, permissions: [...data.permissions].sort((a, b) => a - b) }, {
            accountType: AccountType.COMPANY_MEMBER,
            role: { uuid: company.roles[DefaultRole.ACCOUNTANT] },
            permissions: [...DEFAULT_ROLE_PERMISSIONS[DefaultRole.ACCOUNTANT]].sort((a, b) => a - b),
        });
        await login(anonymous, email, password);
        await api.rejects("POST", usersPath(company.uuid), ErrorCodes.USER.EMAIL_TAKEN, {
            firstName: "Platform", lastName: "Again", canLogIn: true, email, password, roleUuid: company.roles[DefaultRole.STAFF],
        });
    });

    test("the Platform Owner may edit and block the company Owner - but not turn its login off", async () => {
        const ownerPath = `${usersPath(company.uuid)}/${company.owner.uuid}`;
        const fields = { firstName: "Renamed", lastName: "Owner", canLogIn: true, email: company.owner.email };
        matches((await api.ok<ICompanyUser>("PUT", ownerPath, fields)).data, { firstName: "Renamed", accountType: AccountType.COMPANY_OWNER });
        await api.rejects("PUT", ownerPath, ErrorCodes.USER.OWNER_LOCKED, { ...fields, canLogIn: false });

        matches((await api.ok<ICompanyUser>("PATCH", `${ownerPath}/status`, { status: UserStatus.BLOCKED })).data, { status: UserStatus.BLOCKED });
        await company.owner.api.rejects("GET", PATHS.AUTH_USER, ErrorCodes.USER.BLOCKED);
        await api.ok("PATCH", `${ownerPath}/status`, { status: UserStatus.ACTIVE });
        await company.owner.api.ok("GET", PATHS.AUTH_USER);
    });

    test("a user is reached only through their own company", async () => {
        const other = await createCompany(context, "Elsewhere");
        const wrongPath = `${usersPath(company.uuid)}/${other.staff.uuid}`;
        await api.rejects("PUT", wrongPath, ErrorCodes.USER.NOT_FOUND, { firstName: "A", lastName: "B", canLogIn: false });
        await api.rejects("PATCH", `${wrongPath}/status`, ErrorCodes.USER.NOT_FOUND, { status: UserStatus.BLOCKED });
        await other.staff.api.ok("GET", PATHS.AUTH_USER);
        await api.rejectsField("PUT", `${usersPath(company.uuid)}/nope`, "userUuid", { firstName: "A", lastName: "B", canLogIn: false });
    });

    test("an unknown company: its roles and users are not found", async () => {
        const unknown = randomUuid();
        await api.rejects("GET", `${path(unknown)}/roles`, ErrorCodes.COMPANY.NOT_FOUND);
        await api.rejects("GET", usersPath(unknown), ErrorCodes.COMPANY.NOT_FOUND);
        await api.rejects("POST", usersPath(unknown), ErrorCodes.COMPANY.NOT_FOUND, {
            firstName: "A", lastName: "B", canLogIn: false, roleUuid: company.roles[DefaultRole.STAFF],
        });
        const userPath = `${usersPath(unknown)}/${company.staff.uuid}`;
        await api.rejects("PUT", userPath, ErrorCodes.COMPANY.NOT_FOUND, { firstName: "A", lastName: "B", canLogIn: false });
        await api.rejects("PATCH", `${userPath}/status`, ErrorCodes.COMPANY.NOT_FOUND, { status: UserStatus.BLOCKED });
    });

    // --- Who may call it ---

    test("only the Platform Owner: company users and no token are refused", async () => {
        for (const user of [company.owner, company.storekeeper]) {
            await user.api.rejects("GET", PATHS.PLATFORM_COMPANIES, ErrorCodes.AUTH.FORBIDDEN);
            await user.api.rejects("POST", PATHS.PLATFORM_COMPANIES, ErrorCodes.AUTH.FORBIDDEN, createBody());
            await user.api.rejects("GET", usersPath(company.uuid), ErrorCodes.AUTH.FORBIDDEN);
        }
        await anonymous.rejects("GET", PATHS.PLATFORM_COMPANIES, ErrorCodes.AUTH.UNAUTHORIZED);
    });
});
