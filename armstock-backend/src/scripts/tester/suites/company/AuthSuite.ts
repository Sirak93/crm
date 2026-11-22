import jwt from "jsonwebtoken";
import {
    AccountType,
    CompanyStatus,
    DefaultRole,
    ErrorCodes,
    Permission,
    UserStatus,
    type IAuthUser,
    type ILoginResponse,
    type IRefreshResponse,
} from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { anyDate, equals, hasExactKeys, isTrue, matches } from "../../core/Assert";
import { createMember, login } from "../../shared/Accounts";
import { createCompany } from "../../shared/Companies";
import { PATHS } from "../../shared/Paths";
import { randomPassword, uniqueEmail } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { ITestUser } from "../../interfaces/ITestUser";

const AUTH_USER_KEYS = ["uuid", "email", "accountType", "permissions", "status", "firstName", "lastName", "lastLoginAt"];
const ONE_HOUR_SECONDS = 60 * 60;

export default (context: ICompanySideContext) => defineSuite("Auth and sessions", (test) => {
    const { db, anonymous, companyA } = context;

    /** A fresh member, so blocking or logging out never touches the shared fixture users. */
    const freshMember = () => createMember(companyA, { permissions: [Permission.PRODUCT_VIEW], label: "auth" });
    const loginBody = (user: ITestUser) => ({ email: user.email, password: user.password });
    const fullLogin = async (user: ITestUser) => (await anonymous.ok<ILoginResponse>("POST", PATHS.LOGIN, loginBody(user))).data;
    const withToken = (token: string) => anonymous.withToken(token);

    // --- Login ---

    test("login returns the user and two tokens - never the password or the stored refresh token", async () => {
        const member = await freshMember();
        const { data, body } = await anonymous.ok<ILoginResponse>("POST", PATHS.LOGIN, loginBody(member));
        hasExactKeys(data, ["user", "token", "refreshToken"]);
        hasExactKeys(data.user, AUTH_USER_KEYS);
        matches(data.user, {
            uuid: member.uuid,
            email: member.email,
            accountType: AccountType.COMPANY_MEMBER,
            permissions: [Permission.PRODUCT_VIEW],
            status: UserStatus.ACTIVE,
            lastLoginAt: anyDate,
        });
        const [row] = await db.query<{ password: string; refresh_token: string }>(
            "SELECT password, refresh_token FROM users WHERE uuid = $1", [member.uuid]);
        const text = JSON.stringify(body);
        isTrue(!text.includes(row.password) && !text.includes(row.refresh_token), "response holds no stored secret");
    });

    test("the email is matched without case and spaces", async () => {
        const member = await freshMember();
        await anonymous.ok("POST", PATHS.LOGIN, { email: `  ${member.email.toUpperCase()} `, password: member.password });
    });

    test("a wrong password and an unknown email get the same answer", async () => {
        const member = await freshMember();
        const wrong = await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.AUTH.INVALID_CREDENTIALS,
            { email: member.email, password: randomPassword() });
        const unknown = await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.AUTH.INVALID_CREDENTIALS,
            { email: uniqueEmail("nobody"), password: randomPassword() });
        equals(wrong.body.error.message, unknown.body.error.message, "message");
    });

    test("a body without email or password is refused", async () => {
        await anonymous.rejectsField("POST", PATHS.LOGIN, "password", { email: uniqueEmail("x") });
        await anonymous.rejectsField("POST", PATHS.LOGIN, "email", { password: randomPassword() });
    });

    test("the current user: Owner, member and Platform Owner", async () => {
        const read = async (user: ITestUser) => (await user.api.ok<{ user: IAuthUser }>("GET", PATHS.AUTH_USER)).data.user;
        matches(await read(companyA.owner), { uuid: companyA.owner.uuid, accountType: AccountType.COMPANY_OWNER, permissions: [] });
        matches(await read(companyA.hr), { uuid: companyA.hr.uuid, accountType: AccountType.COMPANY_MEMBER });
        matches(await read(context.platformOwner), {
            uuid: context.platformOwner.uuid,
            accountType: AccountType.PLATFORM_OWNER,
            permissions: [],
            firstName: null,
        });
        await anonymous.rejects("GET", PATHS.AUTH_USER, ErrorCodes.AUTH.UNAUTHORIZED);
    });

    // --- Tokens ---

    test("refresh gives a new access token that works", async () => {
        const member = await freshMember();
        const { refreshToken } = await fullLogin(member);
        const { data } = await anonymous.ok<IRefreshResponse>("POST", PATHS.REFRESH, { refreshToken });
        hasExactKeys(data, ["token"]);
        await withToken(data.token).ok("GET", PATHS.AUTH_USER);
    });

    test("refresh refuses an access token, a made-up token and an empty one", async () => {
        const member = await freshMember();
        await anonymous.rejects("POST", PATHS.REFRESH, ErrorCodes.AUTH.UNAUTHORIZED, { refreshToken: member.token });
        await anonymous.rejects("POST", PATHS.REFRESH, ErrorCodes.AUTH.UNAUTHORIZED, { refreshToken: "not-a-token" });
        await anonymous.rejectsField("POST", PATHS.REFRESH, "refreshToken", { refreshToken: "" });
    });

    test("an expired, foreign, malformed or refresh token can't be used as an access token", async () => {
        const member = await freshMember();
        const { refreshToken } = await fullLogin(member);
        const expired = jwt.sign({ userUUID: member.uuid, exp: Math.floor(Date.now() / 1000) - ONE_HOUR_SECONDS }, process.env.JWT_SECRET!);
        const foreign = jwt.sign({ userUUID: member.uuid }, randomPassword());

        for (const token of [expired, foreign, "abc.def.ghi", refreshToken]) {
            await withToken(token).rejects("GET", PATHS.AUTH_USER, ErrorCodes.AUTH.UNAUTHORIZED);
        }
    });

    // --- Logout ---

    test("logout ends the session at once: access token and refresh token both stop working", async () => {
        const member = await freshMember();
        const { token, refreshToken } = await fullLogin(member);
        await withToken(token).ok("POST", PATHS.LOGOUT);
        await withToken(token).rejects("GET", PATHS.AUTH_USER, ErrorCodes.AUTH.UNAUTHORIZED);
        await anonymous.rejects("POST", PATHS.REFRESH, ErrorCodes.AUTH.UNAUTHORIZED, { refreshToken });

        const again = await login(anonymous, member.email, member.password);
        await again.api.ok("GET", PATHS.AUTH_USER);
    });

    test("logout needs a token", async () => {
        await anonymous.rejects("POST", PATHS.LOGOUT, ErrorCodes.AUTH.UNAUTHORIZED);
    });

    // --- Blocked, archived, login turned off ---

    test("a blocked user is stopped on the next request, can't log in or refresh; active again, all works", async () => {
        const member = await freshMember();
        const { token, refreshToken } = await fullLogin(member);
        const status = (value: UserStatus) => companyA.owner.api.ok("PATCH", `${PATHS.COMPANY_USERS}/${member.uuid}/status`, { status: value });

        await status(UserStatus.BLOCKED);
        await withToken(token).rejects("GET", PATHS.AUTH_USER, ErrorCodes.USER.BLOCKED);
        await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.USER.BLOCKED, loginBody(member));
        await anonymous.rejects("POST", PATHS.REFRESH, ErrorCodes.USER.BLOCKED, { refreshToken });

        await status(UserStatus.ACTIVE);
        await withToken(token).ok("GET", PATHS.AUTH_USER);
        await anonymous.ok("POST", PATHS.REFRESH, { refreshToken });
    });

    test("an archived user can't log in or use an open session", async () => {
        const member = await freshMember();
        await companyA.owner.api.ok("PATCH", `${PATHS.COMPANY_USERS}/${member.uuid}/status`, { status: UserStatus.ARCHIVED });
        await member.api.rejects("GET", PATHS.AUTH_USER, ErrorCodes.USER.BLOCKED);
        await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.USER.BLOCKED, loginBody(member));
    });

    test("login turned off: the open session, refresh and login all stop; turned on with a new password, login works", async () => {
        const member = await freshMember();
        const { token, refreshToken } = await fullLogin(member);
        const path = `${PATHS.COMPANY_USERS}/${member.uuid}`;
        const names = { firstName: "Tester", lastName: "Login off" };

        await companyA.owner.api.ok("PUT", path, { ...names, canLogIn: false });
        await withToken(token).rejects("GET", PATHS.AUTH_USER, ErrorCodes.AUTH.UNAUTHORIZED);
        await anonymous.rejects("POST", PATHS.REFRESH, ErrorCodes.AUTH.UNAUTHORIZED, { refreshToken });
        await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.AUTH.INVALID_CREDENTIALS, loginBody(member));

        const password = randomPassword();
        await companyA.owner.api.ok("PUT", path, { ...names, canLogIn: true, email: member.email, password });
        await login(anonymous, member.email, password);
    });

    test("a user without login can never log in", async () => {
        const email = uniqueEmail("no-login");
        await companyA.owner.api.ok("POST", PATHS.COMPANY_USERS, {
            firstName: "Tester",
            lastName: "No login",
            canLogIn: false,
            email,
            password: randomPassword(),
            roleUuid: companyA.roles[DefaultRole.STAFF],
        });
        const [row] = await db.query<{ email: string | null; password: string | null }>(
            "SELECT email, password FROM users WHERE last_name = 'No login' AND company_uuid = $1 ORDER BY created_at DESC LIMIT 1",
            [companyA.uuid],
        );
        matches(row, { email: null, password: null }, "a user without login stores no email or password");
        await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.AUTH.INVALID_CREDENTIALS, { email, password: randomPassword() });
    });

    // --- Blocked company ---

    test("a blocked company: every user is stopped, can't log in or refresh; other companies go on; unblocked, all works", async () => {
        const companyC = await createCompany(context, "C");
        const { token, refreshToken } = await fullLogin(companyC.storekeeper);
        const status = (value: CompanyStatus) =>
            context.platformOwner.api.ok("PATCH", `${PATHS.PLATFORM_COMPANIES}/${companyC.uuid}/status`, { status: value });

        await status(CompanyStatus.BLOCKED);
        for (const user of [companyC.owner, companyC.storekeeper, companyC.staff]) {
            await user.api.rejects("GET", PATHS.AUTH_USER, ErrorCodes.COMPANY.BLOCKED);
        }
        await withToken(token).rejects("GET", PATHS.PRODUCTS, ErrorCodes.COMPANY.BLOCKED);
        await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.COMPANY.BLOCKED, loginBody(companyC.owner));
        await anonymous.rejects("POST", PATHS.REFRESH, ErrorCodes.COMPANY.BLOCKED, { refreshToken });
        await companyA.owner.api.ok("GET", PATHS.AUTH_USER);
        await context.platformOwner.api.ok("GET", PATHS.AUTH_USER);

        await status(CompanyStatus.ACTIVE);
        await withToken(token).ok("GET", PATHS.PRODUCTS);
        await anonymous.ok("POST", PATHS.REFRESH, { refreshToken });
        await login(anonymous, companyC.owner.email, companyC.owner.password);
    });
});
