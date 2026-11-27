import {
    AccountType,
    DEFAULT_ROLE_PERMISSIONS,
    DefaultRole,
    ErrorCodes,
    PASSWORD_MIN_LENGTH,
    Permission,
    UserStatus,
    type ICompanyUser,
    type ICompanyUsersSummary,
    type IRole,
} from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { anyDate, equals, hasExactKeys, isNull, isTrue, matches } from "../../core/Assert";
import { createMember, createNoLoginUser, login } from "../../shared/Accounts";
import { PATHS } from "../../shared/Paths";
import { randomPassword, randomUuid, uniqueEmail, uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { ITestUser } from "../../interfaces/ITestUser";

const USER_KEYS = [
    "uuid", "firstName", "lastName", "position", "email", "accountType", "role",
    "canLogIn", "permissions", "status", "hasPassword", "lastLoginAt", "createdAt",
];

export default (context: ICompanySideContext) => defineSuite("Company users", (test) => {
    const { db, anonymous, companyA, companyB } = context;
    const { owner } = companyA;
    const path = (uuid: string) => `${PATHS.COMPANY_USERS}/${uuid}`;
    const staffRole = companyA.roles[DefaultRole.STAFF];
    const storekeeperRole = companyA.roles[DefaultRole.STOREKEEPER];

    /** A create body with login; any field can be overridden. */
    const createBody = (fields: Record<string, unknown> = {}) => ({
        firstName: uniqueName("First"),
        lastName: "Users",
        position: "Tester",
        canLogIn: true,
        email: uniqueEmail("users"),
        password: randomPassword(),
        roleUuid: staffRole,
        ...fields,
    });
    /** An edit body - the basic fields of `user`, with any overridden. */
    const editBody = (user: ICompanyUser, fields: Record<string, unknown> = {}) => ({
        firstName: user.firstName,
        lastName: user.lastName,
        position: user.position,
        canLogIn: user.canLogIn,
        email: user.email,
        ...fields,
    });
    const create = async (actor: ITestUser, fields: Record<string, unknown> = {}) =>
        (await actor.api.ok<ICompanyUser>("POST", PATHS.COMPANY_USERS, createBody(fields))).data;
    const stored = async (uuid: string) =>
        (await db.query<{ email: string | null; password: string | null; permissions: Permission[] }>(
            "SELECT email, password, permissions FROM users WHERE uuid = $1", [uuid]))[0];

    let manager: ITestUser;
    let adder: ITestUser;

    test("prepares a member who may manage permissions (but not the Owner) and one who may only add users", async () => {
        manager = await createMember(companyA, {
            permissions: [Permission.USER_VIEW, Permission.USER_ADD, Permission.USER_EDIT, Permission.MANAGE_USER_PERMISSIONS],
            label: "manager",
        });
        adder = await createMember(companyA, { permissions: [Permission.USER_VIEW, Permission.USER_ADD], label: "adder" });
    });

    // --- Create ---

    test("the Owner adds a user with login: saved with the sent permissions, nothing secret returned", async () => {
        const email = uniqueEmail("Mixed-Case");
        const password = randomPassword();
        const { data } = await owner.api.ok<ICompanyUser>("POST", PATHS.COMPANY_USERS,
            createBody({ email: `  ${email.toUpperCase()} `, password, permissions: [Permission.PRODUCT_VIEW, Permission.PRODUCT_VIEW] }));
        hasExactKeys(data, USER_KEYS);
        matches(data, {
            email: email.toLowerCase(),
            accountType: AccountType.COMPANY_MEMBER,
            role: { uuid: staffRole },
            canLogIn: true,
            permissions: [Permission.PRODUCT_VIEW],
            status: UserStatus.ACTIVE,
            hasPassword: true,
            lastLoginAt: isNull,
            createdAt: anyDate,
        });
        const row = await stored(data.uuid);
        isTrue(row.password !== null && row.password !== password && row.password.startsWith("$2"), "password stored as a bcrypt hash");
        await login(anonymous, email, password);
    });

    test("a user without login keeps no email, password or permissions", async () => {
        const { data } = await owner.api.ok<ICompanyUser>("POST", PATHS.COMPANY_USERS,
            createBody({ canLogIn: false, permissions: [Permission.PRODUCT_VIEW] }));
        matches(data, { canLogIn: false, email: isNull, hasPassword: false, permissions: [] });
        matches(await stored(data.uuid), { email: null, password: null, permissions: [] });
    });

    test("bad create bodies are refused, each naming its field", async () => {
        const post = (field: string, fields: Record<string, unknown>) =>
            owner.api.rejectsField("POST", PATHS.COMPANY_USERS, field, createBody(fields));
        await post("email", { email: null });
        await post("email", { email: "not-an-email" });
        await post("password", { password: null });
        await post("password", { password: "x".repeat(PASSWORD_MIN_LENGTH - 1) });
        await post("firstName", { firstName: " " });
        await post("lastName", { lastName: "" });
        await post("roleUuid", { roleUuid: "nope" });
        await post("canLogIn", { canLogIn: "yes" });
        await post("permissions.0", { permissions: [999] });
    });

    test("an unknown role is refused", async () => {
        await owner.api.rejects("POST", PATHS.COMPANY_USERS, ErrorCodes.ROLE.NOT_FOUND, createBody({ roleUuid: randomUuid() }));
    });

    test("an email already used - in any company, in any case - is refused", async () => {
        const first = await create(owner);
        await owner.api.rejects("POST", PATHS.COMPANY_USERS, ErrorCodes.USER.EMAIL_TAKEN, createBody({ email: first.email!.toUpperCase() }));
        await owner.api.rejects("POST", PATHS.COMPANY_USERS, ErrorCodes.USER.EMAIL_TAKEN, createBody({ email: companyB.staff.email }));
    });

    test("someone who can't manage permissions adds a user: the role's permissions are copied, the sent ones ignored", async () => {
        const user = await create(adder, { roleUuid: storekeeperRole, permissions: [Permission.RECIPE_ADD] });
        const { data: roles } = await owner.api.ok<IRole[]>("GET", PATHS.ROLES);
        const role = roles.find((r) => r.uuid === storekeeperRole)!;
        matches([...user.permissions].sort(), [...role.permissions].sort());
        isTrue(!user.permissions.includes(Permission.RECIPE_ADD), "the sent permission was not given");
    });

    // --- Owner-only permission ---

    test("MANAGE_USER_PERMISSIONS: a role may carry it, but only the Owner hands it out", async () => {
        const { data: role } = await owner.api.ok<IRole>("POST", PATHS.ROLES, {
            name: uniqueName("Admins"),
            permissions: [Permission.MANAGE_USER_PERMISSIONS, Permission.USER_VIEW],
        });
        matches([...role.permissions].sort(), [Permission.USER_VIEW, Permission.MANAGE_USER_PERMISSIONS].sort());

        const byOwner = await create(owner, { roleUuid: role.uuid });
        isTrue(byOwner.permissions.includes(Permission.MANAGE_USER_PERMISSIONS), "the Owner's new user gets it from the role");

        const byAdder = await create(adder, { roleUuid: role.uuid });
        matches(byAdder.permissions, [Permission.USER_VIEW], "the adder's new user does not get it");

        const byManager = await create(manager, { roleUuid: role.uuid, permissions: [Permission.MANAGE_USER_PERMISSIONS, Permission.PRODUCT_VIEW] });
        matches(byManager.permissions, [Permission.PRODUCT_VIEW], "the manager's new user does not get it");
    });

    test("a member who manages permissions can't give MANAGE_USER_PERMISSIONS, nor take it away", async () => {
        const target = await create(owner);
        const access = (actor: ITestUser, uuid: string, permissions: Permission[]) =>
            actor.api.ok<ICompanyUser>("PUT", `${path(uuid)}/access`, { roleUuid: staffRole, permissions });

        matches((await access(manager, target.uuid, [Permission.MANAGE_USER_PERMISSIONS, Permission.PRODUCT_VIEW])).data.permissions,
            [Permission.PRODUCT_VIEW]);

        await access(owner, target.uuid, [Permission.MANAGE_USER_PERMISSIONS]);
        const { data } = await access(manager, target.uuid, [Permission.SUPPLIER_VIEW]);
        matches([...data.permissions].sort(), [Permission.SUPPLIER_VIEW, Permission.MANAGE_USER_PERMISSIONS].sort());

        matches((await access(owner, target.uuid, [])).data.permissions, [], "the Owner can take it away");
    });

    // --- Edit ---

    test("edit changes the basic fields only - role and permissions stay", async () => {
        const user = await create(owner, { roleUuid: storekeeperRole, permissions: [Permission.PRODUCT_VIEW] });
        const email = uniqueEmail("edited");
        const { data } = await owner.api.ok<ICompanyUser>("PUT", path(user.uuid), {
            ...editBody(user, { firstName: "Edited", lastName: "Name", position: null, email }),
            roleUuid: staffRole,
            permissions: [Permission.RECIPE_ADD],
        });
        matches(data, {
            firstName: "Edited",
            lastName: "Name",
            position: isNull,
            email,
            role: { uuid: storekeeperRole },
            permissions: [Permission.PRODUCT_VIEW],
        });
    });

    test("edit: an email used by someone else is refused; keeping your own is fine", async () => {
        const [a, b] = [await create(owner), await create(owner)];
        await owner.api.rejects("PUT", path(a.uuid), ErrorCodes.USER.EMAIL_TAKEN, editBody(a, { email: b.email }));
        await owner.api.ok("PUT", path(a.uuid), editBody(a, { position: "Same email" }));
    });

    test("turning login on needs a password if there is none; then the role's permissions start", async () => {
        const target = await createNoLoginUser(companyA);
        const email = uniqueEmail("login-on");

        await owner.api.rejects("PUT", path(target.uuid), ErrorCodes.USER.PASSWORD_REQUIRED, editBody(target, { canLogIn: true, email }));
        const password = randomPassword();
        const { data } = await owner.api.ok<ICompanyUser>("PUT", path(target.uuid), editBody(target, { canLogIn: true, email, password }));
        matches(data, { canLogIn: true, email, hasPassword: true, permissions: [...DEFAULT_ROLE_PERMISSIONS[DefaultRole.STAFF]] });
        await login(anonymous, email, password);
    });

    test("turning login off drops the email, password and permissions", async () => {
        const user = await create(owner, { permissions: [Permission.PRODUCT_VIEW] });
        const { data } = await owner.api.ok<ICompanyUser>("PUT", path(user.uuid), editBody(user, { canLogIn: false }));
        matches(data, { canLogIn: false, email: isNull, hasPassword: false, permissions: [] });
        matches(await stored(user.uuid), { email: null, password: null, permissions: [] });
    });

    test("access for a user without login keeps the permissions empty", async () => {
        const user = await createNoLoginUser(companyA);
        const { data } = await owner.api.ok<ICompanyUser>("PUT", `${path(user.uuid)}/access`,
            { roleUuid: storekeeperRole, permissions: [Permission.PRODUCT_VIEW] });
        matches(data, { role: { uuid: storekeeperRole }, permissions: [] });
    });

    test("access with an unknown role is refused", async () => {
        const user = await create(owner);
        await owner.api.rejects("PUT", `${path(user.uuid)}/access`, ErrorCodes.ROLE.NOT_FOUND, { roleUuid: randomUuid(), permissions: [] });
    });

    // --- Your own account, the Owner account ---

    test("nobody changes their own login, access or status", async () => {
        const self = (await manager.api.ok<ICompanyUser[]>("GET", `${PATHS.COMPANY_USERS}?search=manager`)).data
            .find((u) => u.uuid === manager.uuid)!;
        await manager.api.rejects("PUT", path(manager.uuid), ErrorCodes.USER.OWN_ACCOUNT, editBody(self, { canLogIn: false }));
        await manager.api.rejects("PUT", `${path(manager.uuid)}/access`, ErrorCodes.USER.OWN_ACCOUNT,
            { roleUuid: staffRole, permissions: [Permission.RECIPE_ADD] });
        await manager.api.rejects("PATCH", `${path(manager.uuid)}/status`, ErrorCodes.USER.OWN_ACCOUNT, { status: UserStatus.BLOCKED });
        await manager.api.ok("PUT", path(manager.uuid), editBody(self, { position: "Own name is fine" }));
    });

    test("only the Owner or a permissions manager sets a new password for a user who manages permissions", async () => {
        const target = await create(owner, { permissions: [Permission.MANAGE_USER_PERMISSIONS] });
        const editor = await createMember(companyA, { permissions: [Permission.USER_VIEW, Permission.USER_EDIT], label: "editor" });
        const withPassword = () => editBody(target, { password: randomPassword() });

        await editor.api.rejects("PUT", path(target.uuid), ErrorCodes.USER.PASSWORD_LOCKED, withPassword());
        await editor.api.ok("PUT", path(target.uuid), editBody(target, { position: "No password - fine" }));
        await owner.api.ok("PUT", path(target.uuid), withPassword());
        await manager.api.ok("PUT", path(target.uuid), withPassword());

        const plain = await create(owner);
        await editor.api.ok("PUT", path(plain.uuid), editBody(plain, { password: randomPassword() }));
    });

    test("the Owner account can't be changed from the company side - not even by the Owner", async () => {
        const ownerRow = (await owner.api.ok<ICompanyUser[]>("GET", `${PATHS.COMPANY_USERS}?pageSize=100`)).data
            .find((u) => u.uuid === owner.uuid)!;
        matches(ownerRow, { accountType: AccountType.COMPANY_OWNER, role: isNull, permissions: [] });
        for (const actor of [manager, owner]) {
            await actor.api.rejects("PUT", path(owner.uuid), ErrorCodes.USER.OWNER_LOCKED, editBody(ownerRow, { position: "Changed" }));
            await actor.api.rejects("PUT", `${path(owner.uuid)}/access`, ErrorCodes.USER.OWNER_LOCKED, { roleUuid: staffRole, permissions: [] });
            await actor.api.rejects("PATCH", `${path(owner.uuid)}/status`, ErrorCodes.USER.OWNER_LOCKED, { status: UserStatus.BLOCKED });
        }
    });

    // --- Status ---

    test("status: block, archive and back; the summary follows", async () => {
        const user = await create(owner);
        const summary = async () => (await owner.api.ok<ICompanyUsersSummary>("GET", `${PATHS.COMPANY_USERS}/summary`)).data;
        const before = await summary();
        const setStatus = (status: UserStatus) => owner.api.ok<ICompanyUser>("PATCH", `${path(user.uuid)}/status`, { status });

        matches((await setStatus(UserStatus.BLOCKED)).data, { status: UserStatus.BLOCKED });
        matches(await summary(), { active: before.active - 1, blocked: before.blocked + 1 });
        matches((await setStatus(UserStatus.ARCHIVED)).data, { status: UserStatus.ARCHIVED });
        matches(await summary(), { active: before.active - 1, blocked: before.blocked });
        await setStatus(UserStatus.ACTIVE);
        matches(await summary(), before);
        await owner.api.rejectsField("PATCH", `${path(user.uuid)}/status`, "status", { status: 999 });
    });

    test("the summary matches the database", async () => {
        const count = (status: UserStatus) => db.count("users", "company_uuid = $1 AND status = $2", [companyA.uuid, status]);
        const { data } = await owner.api.ok<ICompanyUsersSummary>("GET", `${PATHS.COMPANY_USERS}/summary`);
        matches(data, { active: await count(UserStatus.ACTIVE), blocked: await count(UserStatus.BLOCKED) });
    });

    // --- List ---

    test("list: everyone of the company incl. the Owner, active first, never anything secret", async () => {
        const { data, meta } = await owner.api.ok<ICompanyUser[]>("GET", `${PATHS.COMPANY_USERS}?pageSize=100`);
        equals(meta.total, await db.count("users", "company_uuid = $1", [companyA.uuid]), "total");
        isTrue(data.some((u) => u.uuid === owner.uuid), "the Owner is listed");
        const statuses = data.map((u) => u.status);
        matches(statuses, [...statuses].sort((a, b) => a - b), "ordered by status");
        for (const user of data) hasExactKeys(user, USER_KEYS);
    });

    test("list filters by status, role and search (name, position, email)", async () => {
        const tag = uniqueName("Findme").replace(" ", "");
        const user = await create(owner, { firstName: tag, position: `${tag}-pos`, roleUuid: storekeeperRole });
        await owner.api.ok("PATCH", `${path(user.uuid)}/status`, { status: UserStatus.BLOCKED });
        const query = async (params: string) => (await owner.api.ok<ICompanyUser[]>("GET", `${PATHS.COMPANY_USERS}?pageSize=100&${params}`)).data;

        const blocked = await query(`status=${UserStatus.BLOCKED}`);
        isTrue(blocked.length > 0 && blocked.every((u) => u.status === UserStatus.BLOCKED), "status filter");
        const byRole = await query(`roleUuid=${storekeeperRole}`);
        isTrue(byRole.length > 0 && byRole.every((u) => u.role?.uuid === storekeeperRole), "role filter");
        for (const search of [tag.toLowerCase(), `${tag}-pos`, user.email!.slice(0, 12)]) {
            isTrue((await query(`search=${encodeURIComponent(search)}`)).some((u) => u.uuid === user.uuid), `search "${search}"`);
        }
        await owner.api.rejectsField("GET", `${PATHS.COMPANY_USERS}?status=999`, "status");
        await owner.api.rejectsField("GET", `${PATHS.COMPANY_USERS}?roleUuid=nope`, "roleUuid");
    });

    test("paging", async () => {
        const total = await db.count("users", "company_uuid = $1", [companyA.uuid]);
        const { data, meta } = await owner.api.ok<ICompanyUser[]>("GET", `${PATHS.COMPANY_USERS}?page=2&pageSize=5`);
        matches(meta, { page: 2, pageSize: 5, total, totalPages: Math.ceil(total / 5) });
        equals(data.length, Math.min(5, total - 5), "items on page 2");
    });

    // --- Unknown ---

    test("an unknown uuid gives 404, a malformed one 422", async () => {
        const unknown = randomUuid();
        const body = { firstName: "A", lastName: "B", canLogIn: false };
        await owner.api.rejects("PUT", path(unknown), ErrorCodes.USER.NOT_FOUND, body);
        await owner.api.rejects("PUT", `${path(unknown)}/access`, ErrorCodes.USER.NOT_FOUND, { roleUuid: staffRole, permissions: [] });
        await owner.api.rejects("PATCH", `${path(unknown)}/status`, ErrorCodes.USER.NOT_FOUND, { status: UserStatus.ACTIVE });
        await owner.api.rejectsField("PUT", path("nope"), "uuid", body);
    });
});
