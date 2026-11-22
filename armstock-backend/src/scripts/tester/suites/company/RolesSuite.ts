import { ErrorCodes, Permission, UserStatus, type ICompanyUser, type IRole } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, hasExactKeys, isTrue, matches } from "../../core/Assert";
import { createMember } from "../../shared/Accounts";
import { PATHS } from "../../shared/Paths";
import { randomPassword, randomUuid, uniqueEmail, uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { ITestUser } from "../../interfaces/ITestUser";

const ROLE_KEYS = ["uuid", "name", "permissions", "userCount"];
const NAME_MAX = 100;

export default (context: ICompanySideContext) => defineSuite("Roles", (test) => {
    const { db, anonymous, companyA } = context;
    const { owner } = companyA;
    const path = (uuid: string) => `${PATHS.ROLES}/${uuid}`;
    const sorted = (list: Permission[]) => [...list].sort((a, b) => a - b);

    const createRole = async (actor: ITestUser, permissions: Permission[] = [], name = uniqueName("Role")) =>
        (await actor.api.ok<IRole>("POST", PATHS.ROLES, { name, permissions })).data;
    /** A logged-in user of `role`, added by the Owner with exactly `permissions`. */
    const userOf = async (role: IRole, permissions: Permission[]) => {
        const email = uniqueEmail("role-user");
        const password = randomPassword();
        const { data } = await owner.api.ok<ICompanyUser>("POST", PATHS.COMPANY_USERS, {
            firstName: uniqueName("Role"), lastName: "User", canLogIn: true, email, password, roleUuid: role.uuid, permissions,
        });
        return data;
    };
    const permissionsOf = async (uuid: string) =>
        sorted((await db.query<{ permissions: Permission[] }>("SELECT permissions FROM users WHERE uuid = $1", [uuid]))[0].permissions);
    const listed = async (uuid: string) => (await owner.api.ok<IRole[]>("GET", PATHS.ROLES)).data.find((r) => r.uuid === uuid);

    let manager: ITestUser;

    test("prepares a member who may manage permissions", async () => {
        manager = await createMember(companyA, {
            permissions: [Permission.MANAGE_USER_PERMISSIONS, Permission.USER_VIEW],
            label: "role-manager",
        });
    });

    // --- Create ---

    test("create: saved with its permissions, once each, and no users", async () => {
        const name = uniqueName("Cashiers");
        const { data } = await owner.api.ok<IRole>("POST", PATHS.ROLES, {
            name: `  ${name} `,
            permissions: [Permission.PRODUCT_VIEW, Permission.PRODUCT_VIEW, Permission.STOCK_IN_VIEW],
        });
        hasExactKeys(data, ROLE_KEYS);
        matches({ ...data, permissions: sorted(data.permissions) }, {
            name,
            permissions: [Permission.PRODUCT_VIEW, Permission.STOCK_IN_VIEW],
            userCount: 0,
        });
        matches(await listed(data.uuid), { name, userCount: 0 });
    });

    test("bad bodies are refused", async () => {
        const post = (field: string, body: Record<string, unknown>) => owner.api.rejectsField("POST", PATHS.ROLES, field, body);
        await post("name", { name: " ", permissions: [] });
        await post("name", { name: "x".repeat(NAME_MAX + 1), permissions: [] });
        await post("permissions", { name: uniqueName("Role") });
        await post("permissions.0", { name: uniqueName("Role"), permissions: [999] });
        await post("applyToUsers", { name: uniqueName("Role"), permissions: [], applyToUsers: "yes" });
    });

    test("a name already used in the company - in any case - is refused; another company may use it", async () => {
        const role = await createRole(owner);
        await owner.api.rejects("POST", PATHS.ROLES, ErrorCodes.ROLE.NAME_TAKEN, { name: role.name.toUpperCase(), permissions: [] });
        await createRole(context.companyB.owner, [], role.name);
    });

    test("only the Owner can put MANAGE_USER_PERMISSIONS into a role", async () => {
        const byOwner = await createRole(owner, [Permission.MANAGE_USER_PERMISSIONS, Permission.USER_VIEW]);
        matches(sorted(byOwner.permissions), sorted([Permission.MANAGE_USER_PERMISSIONS, Permission.USER_VIEW]));
        const byManager = await createRole(manager, [Permission.MANAGE_USER_PERMISSIONS, Permission.USER_VIEW]);
        matches(byManager.permissions, [Permission.USER_VIEW]);
    });

    // --- Edit ---

    test("edit changes the name and permissions; its users keep theirs unless applied", async () => {
        const role = await createRole(owner, [Permission.PRODUCT_VIEW]);
        const user = await userOf(role, [Permission.PRODUCT_VIEW, Permission.SUPPLIER_VIEW]);
        const name = uniqueName("Renamed");

        const { data } = await owner.api.ok<IRole>("PUT", path(role.uuid), { name, permissions: [Permission.STOCK_IN_VIEW] });
        matches(data, { uuid: role.uuid, name, permissions: [Permission.STOCK_IN_VIEW], userCount: 1 });
        matches(await permissionsOf(user.uuid), sorted([Permission.PRODUCT_VIEW, Permission.SUPPLIER_VIEW]));
    });

    test("edit: renaming to another role's name is refused; keeping its own name is fine", async () => {
        const [a, b] = [await createRole(owner), await createRole(owner)];
        await owner.api.rejects("PUT", path(a.uuid), ErrorCodes.ROLE.NAME_TAKEN, { name: b.name, permissions: [] });
        await owner.api.ok("PUT", path(a.uuid), { name: a.name.toUpperCase(), permissions: [Permission.PRODUCT_VIEW] });
    });

    test("apply to users: users who log in get the role's permissions; users without login stay empty", async () => {
        const role = await createRole(owner, [Permission.PRODUCT_VIEW]);
        const [first, second] = [await userOf(role, [Permission.SUPPLIER_VIEW]), await userOf(role, [])];
        const { data: noLogin } = await owner.api.ok<ICompanyUser>("POST", PATHS.COMPANY_USERS,
            { firstName: uniqueName("Role"), lastName: "No login", canLogIn: false, roleUuid: role.uuid });
        const otherRole = await createRole(owner, []);
        const outsider = await userOf(otherRole, [Permission.SUPPLIER_VIEW]);

        const permissions = [Permission.STOCK_OUT_VIEW, Permission.PRODUCT_VIEW];
        await owner.api.ok("PUT", path(role.uuid), { name: role.name, permissions, applyToUsers: true });
        matches(await permissionsOf(first.uuid), sorted(permissions), "first user");
        matches(await permissionsOf(second.uuid), sorted(permissions), "second user");
        matches(await permissionsOf(noLogin.uuid), [], "user without login");
        matches(await permissionsOf(outsider.uuid), [Permission.SUPPLIER_VIEW], "a user of another role");
    });

    test("apply to users works on open sessions at once", async () => {
        const role = await createRole(owner, [Permission.PRODUCT_VIEW]);
        const email = uniqueEmail("role-session");
        const password = randomPassword();
        await owner.api.ok("POST", PATHS.COMPANY_USERS, {
            firstName: "Role", lastName: "Session", canLogIn: true, email, password, roleUuid: role.uuid, permissions: [Permission.PRODUCT_VIEW],
        });
        const { data: login } = await anonymous.ok("POST", PATHS.LOGIN, { email, password });
        const session = anonymous.withToken(login.token);
        await session.ok("GET", PATHS.PRODUCTS);

        await owner.api.ok("PUT", path(role.uuid), { name: role.name, permissions: [Permission.SUPPLIER_VIEW], applyToUsers: true });
        await session.rejects("GET", PATHS.PRODUCTS, ErrorCodes.AUTH.FORBIDDEN);
        await session.ok("GET", PATHS.SUPPLIERS);
    });

    test("a manager applying a role keeps each user's MANAGE_USER_PERMISSIONS as it was, and skips themselves", async () => {
        const role = await createRole(owner, [Permission.MANAGE_USER_PERMISSIONS, Permission.USER_VIEW]);
        const holder = await userOf(role, [Permission.MANAGE_USER_PERMISSIONS]);
        const plain = await userOf(role, []);
        await owner.api.ok("PUT", `${PATHS.COMPANY_USERS}/${manager.uuid}/access`,
            { roleUuid: role.uuid, permissions: [Permission.MANAGE_USER_PERMISSIONS, Permission.USER_VIEW] });

        const { data } = await manager.api.ok<IRole>("PUT", path(role.uuid),
            { name: role.name, permissions: [Permission.PRODUCT_VIEW], applyToUsers: true });
        matches(sorted(data.permissions), sorted([Permission.PRODUCT_VIEW, Permission.MANAGE_USER_PERMISSIONS]), "the role keeps it");
        matches(await permissionsOf(holder.uuid), sorted([Permission.PRODUCT_VIEW, Permission.MANAGE_USER_PERMISSIONS]), "holder");
        matches(await permissionsOf(plain.uuid), [Permission.PRODUCT_VIEW], "plain user");
        matches(await permissionsOf(manager.uuid), sorted([Permission.MANAGE_USER_PERMISSIONS, Permission.USER_VIEW]), "the manager");
    });

    test("the Owner applying a role sets MANAGE_USER_PERMISSIONS exactly as in the role", async () => {
        const role = await createRole(owner, [Permission.MANAGE_USER_PERMISSIONS]);
        const holder = await userOf(role, [Permission.MANAGE_USER_PERMISSIONS]);
        await owner.api.ok("PUT", path(role.uuid), { name: role.name, permissions: [Permission.USER_VIEW], applyToUsers: true });
        matches(await permissionsOf(holder.uuid), [Permission.USER_VIEW]);
    });

    // --- Delete ---

    test("delete is refused while users have the role - archived ones too - with the count", async () => {
        const role = await createRole(owner);
        const users = [await userOf(role, []), await userOf(role, []), await userOf(role, [])];
        await owner.api.ok("PATCH", `${PATHS.COMPANY_USERS}/${users[2].uuid}/status`, { status: UserStatus.ARCHIVED });

        const response = await owner.api.rejects("DELETE", path(role.uuid), ErrorCodes.ROLE.IN_USE);
        matches(response.body.error.meta, { userCount: 3 });
        matches(await listed(role.uuid), { userCount: 3 });

        const otherRole = await createRole(owner);
        for (const user of users) {
            await owner.api.ok("PUT", `${PATHS.COMPANY_USERS}/${user.uuid}/access`, { roleUuid: otherRole.uuid, permissions: [] });
        }
        await owner.api.ok("DELETE", path(role.uuid));
        isTrue(!(await listed(role.uuid)), "the role is gone");
        await owner.api.rejects("PUT", path(role.uuid), ErrorCodes.ROLE.NOT_FOUND, { name: uniqueName("Gone"), permissions: [] });
    });

    // --- List ---

    test("list: every role of the company, sorted by name, with user counts that match the database", async () => {
        const { data } = await owner.api.ok<IRole[]>("GET", PATHS.ROLES);
        equals(data.length, await db.count("roles", "company_uuid = $1", [companyA.uuid]), "role count");
        const ordered = await db.query<{ name: string }>("SELECT name FROM roles WHERE company_uuid = $1 ORDER BY name ASC", [companyA.uuid]);
        matches(data.map((r) => r.name), ordered.map((r) => r.name), "sorted by name, as the database sorts");
        for (const role of data) {
            hasExactKeys(role, ROLE_KEYS);
            equals(role.userCount, await db.count("users", "role_uuid = $1", [role.uuid]), `${role.name} user count`);
        }
    });

    test("an unknown uuid gives 404, a malformed one 422", async () => {
        const unknown = randomUuid();
        await owner.api.rejects("PUT", path(unknown), ErrorCodes.ROLE.NOT_FOUND, { name: uniqueName("Role"), permissions: [] });
        await owner.api.rejects("DELETE", path(unknown), ErrorCodes.ROLE.NOT_FOUND);
        await owner.api.rejectsField("DELETE", path("nope"), "uuid");
    });
});
