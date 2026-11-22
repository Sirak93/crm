import { CompanyStatus, ErrorCodes, Permission, type ICompany } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { anyDate, hasExactKeys, isNull, matches } from "../../core/Assert";
import { createMember } from "../../shared/Accounts";
import { createCompany } from "../../shared/Companies";
import { PATHS } from "../../shared/Paths";
import { uniqueEmail, uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { ITestCompany } from "../../interfaces/ITestCompany";

const COMPANY_KEYS = ["uuid", "name", "taxId", "phone", "email", "address", "status", "createdAt"];

/** Its own company, so renaming never touches the shared fixture. */
export default (context: ICompanySideContext) => defineSuite("Company profile", (test) => {
    const { db } = context;
    let company: ITestCompany;

    test("prepares a company of its own", async () => {
        company = await createCompany(context, "Profile");
    });

    test("the Owner sees the company profile", async () => {
        const { data } = await company.owner.api.ok<ICompany>("GET", PATHS.COMPANY);
        hasExactKeys(data, COMPANY_KEYS);
        matches(data, { uuid: company.uuid, name: company.name, status: CompanyStatus.ACTIVE, createdAt: anyDate });
    });

    test("edit saves every field, trimmed; empty ones as null; the status can't be changed here", async () => {
        const name = uniqueName("Renamed");
        const email = uniqueEmail("company");
        const { data } = await company.owner.api.ok<ICompany>("PUT", PATHS.COMPANY, {
            name: `  ${name} `,
            taxId: "01234567",
            phone: "+374 10 111111",
            email,
            address: "Yerevan",
            status: CompanyStatus.BLOCKED,
        });
        matches(data, { name, taxId: "01234567", phone: "+374 10 111111", email, address: "Yerevan", status: CompanyStatus.ACTIVE });

        const cleared = await company.owner.api.ok<ICompany>("PUT", PATHS.COMPANY, { name, taxId: "", phone: " ", email: "", address: null });
        matches(cleared.data, { taxId: isNull, phone: isNull, email: isNull, address: isNull });
        const [row] = await db.query<{ name: string; status: CompanyStatus }>("SELECT name, status FROM companies WHERE uuid = $1", [company.uuid]);
        matches(row, { name, status: CompanyStatus.ACTIVE });
    });

    test("bad bodies are refused", async () => {
        await company.owner.api.rejectsField("PUT", PATHS.COMPANY, "name", { name: " " });
        await company.owner.api.rejectsField("PUT", PATHS.COMPANY, "email", { name: "X", email: "not-an-email" });
        await company.owner.api.rejectsField("PUT", PATHS.COMPANY, "address", { name: "X", address: "x".repeat(501) });
    });

    test("a member with COMPANY_EDIT can see and edit it; one without it can't", async () => {
        const editor = await createMember(company, { permissions: [Permission.COMPANY_EDIT], label: "company-editor" });
        const name = uniqueName("By editor");
        await editor.api.ok("GET", PATHS.COMPANY);
        matches((await editor.api.ok<ICompany>("PUT", PATHS.COMPANY, { name })).data, { name });
        await company.storekeeper.api.rejects("GET", PATHS.COMPANY, ErrorCodes.AUTH.FORBIDDEN);
        await company.storekeeper.api.rejects("PUT", PATHS.COMPANY, ErrorCodes.AUTH.FORBIDDEN, { name: "Nope" });
    });

    test("each company sees and edits only its own profile", async () => {
        const { data } = await context.companyA.owner.api.ok<ICompany>("GET", PATHS.COMPANY);
        matches(data, { uuid: context.companyA.uuid });
        const [row] = await db.query<{ name: string }>("SELECT name FROM companies WHERE uuid = $1", [context.companyA.uuid]);
        matches(row, { name: context.companyA.name }, "company A was not renamed by company Profile's edits");
    });
});
