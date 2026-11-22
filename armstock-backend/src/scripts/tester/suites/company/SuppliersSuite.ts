import { ErrorCodes, SupplierStatus, type ISupplier, type ISupplierContact } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { anyDate, equals, hasExactKeys, isNull, matches } from "../../core/Assert";
import { createContact, createProduct, createStockIn, createSupplier } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { randomUuid, uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

const SUPPLIER_KEYS = ["uuid", "name", "taxId", "note", "status", "contacts", "createdAt"];
const CONTACT_KEYS = ["uuid", "name", "position", "phone", "note"];

export default (context: ICompanySideContext) => defineSuite("Suppliers and contacts", (test) => {
    const { db, companyA } = context;
    const { accountant, storekeeper } = companyA;
    const path = (uuid: string) => `${PATHS.SUPPLIERS}/${uuid}`;
    const contactPath = (supplierUuid: string, contactUuid: string) => `${path(supplierUuid)}/contacts/${contactUuid}`;
    const tag = uniqueName("Supp").replace(" ", "");
    const getOne = async (uuid: string) =>
        (await accountant.api.ok<ISupplier[]>("GET", `${PATHS.SUPPLIERS}?pageSize=100&search=${encodeURIComponent(tag)}`)).data.find((s) => s.uuid === uuid);

    // --- Suppliers ---

    test("create: saved active with no contacts; empty fields stored as null", async () => {
        const name = `${tag} Alpha`;
        const { data } = await accountant.api.ok<ISupplier>("POST", PATHS.SUPPLIERS, { name: `  ${name} `, taxId: " ", note: "" });
        hasExactKeys(data, SUPPLIER_KEYS);
        matches(data, { name, taxId: isNull, note: isNull, status: SupplierStatus.ACTIVE, contacts: [], createdAt: anyDate });
    });

    test("bad bodies are refused", async () => {
        await accountant.api.rejectsField("POST", PATHS.SUPPLIERS, "name", { name: "" });
        await accountant.api.rejectsField("POST", PATHS.SUPPLIERS, "name", { name: "x".repeat(201) });
        await accountant.api.rejectsField("POST", PATHS.SUPPLIERS, "taxId", { name: uniqueName(tag), taxId: "1".repeat(51) });
    });

    test("a name is unique in the company ignoring case - archived suppliers count too; another company may reuse it", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        await accountant.api.ok("PATCH", `${path(supplier.uuid)}/status`, { status: SupplierStatus.ARCHIVED });
        await accountant.api.rejects("POST", PATHS.SUPPLIERS, ErrorCodes.SUPPLIER.NAME_TAKEN, { name: supplier.name.toUpperCase() });
        await createSupplier(context.companyB.accountant, { name: supplier.name });
    });

    test("edit changes name, tax id and note, keeps the contacts; a taken name is refused", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        const other = await createSupplier(accountant, { name: uniqueName(tag) });
        const contact = await createContact(accountant, supplier.uuid);
        const name = uniqueName(`${tag} Edited`);
        const { data } = await accountant.api.ok<ISupplier>("PUT", path(supplier.uuid), { name, taxId: "01234567", note: "Pays late" });
        matches(data, { name, taxId: "01234567", note: "Pays late", contacts: [{ uuid: contact.uuid }] });
        await accountant.api.rejects("PUT", path(supplier.uuid), ErrorCodes.SUPPLIER.NAME_TAKEN, { name: other.name.toLowerCase() });
        await accountant.api.ok("PUT", path(supplier.uuid), { name: name.toUpperCase() });
    });

    test("archive and back", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        const setStatus = (status: SupplierStatus) => accountant.api.ok<ISupplier>("PATCH", `${path(supplier.uuid)}/status`, { status });
        matches((await setStatus(SupplierStatus.ARCHIVED)).data, { status: SupplierStatus.ARCHIVED });
        matches((await setStatus(SupplierStatus.ACTIVE)).data, { status: SupplierStatus.ACTIVE });
        await accountant.api.rejectsField("PATCH", `${path(supplier.uuid)}/status`, "status", { status: 999 });
    });

    test("an unused supplier can be deleted - its contacts go with it", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        await createContact(accountant, supplier.uuid);
        await createContact(accountant, supplier.uuid);
        await accountant.api.ok("DELETE", path(supplier.uuid));
        equals(await db.count("suppliers", "uuid = $1", [supplier.uuid]), 0, "suppliers left");
        equals(await db.count("supplier_contacts", "supplier_uuid = $1", [supplier.uuid]), 0, "contacts left");
        await accountant.api.rejects("DELETE", path(supplier.uuid), ErrorCodes.SUPPLIER.NOT_FOUND);
    });

    test("a supplier used in a stock-in can't be deleted", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        const product = await createProduct(storekeeper);
        await createStockIn(storekeeper, [{ productUuid: product.uuid, quantity: 1 }], { supplierUuid: supplier.uuid });
        await accountant.api.rejects("DELETE", path(supplier.uuid), ErrorCodes.SUPPLIER.IN_USE);
        equals(await db.count("suppliers", "uuid = $1", [supplier.uuid]), 1, "still there");
    });

    // --- Contacts ---

    test("add a contact: saved with its fields; empty ones stored as null", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        const { data } = await accountant.api.ok<ISupplierContact>("POST", `${path(supplier.uuid)}/contacts`,
            { name: "  Ani  ", position: "Manager", phone: "+374 10 000000", note: "" });
        hasExactKeys(data, CONTACT_KEYS);
        matches(data, { name: "Ani", position: "Manager", phone: "+374 10 000000", note: isNull });
        await accountant.api.rejectsField("POST", `${path(supplier.uuid)}/contacts`, "name", { name: " " });
    });

    test("contacts are listed with their supplier, sorted by name", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        await createContact(accountant, supplier.uuid, { name: "Zara" });
        await createContact(accountant, supplier.uuid, { name: "Aram" });
        matches((await getOne(supplier.uuid))!.contacts.map((c) => c.name), ["Aram", "Zara"]);
    });

    test("edit and delete a contact", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        const contact = await createContact(accountant, supplier.uuid);
        const { data } = await accountant.api.ok<ISupplierContact>("PUT", contactPath(supplier.uuid, contact.uuid),
            { name: "Edited", position: null, phone: "123", note: "Evenings" });
        matches(data, { uuid: contact.uuid, name: "Edited", position: isNull, phone: "123", note: "Evenings" });
        await accountant.api.ok("DELETE", contactPath(supplier.uuid, contact.uuid));
        matches((await getOne(supplier.uuid))!.contacts, []);
        await accountant.api.rejects("DELETE", contactPath(supplier.uuid, contact.uuid), ErrorCodes.SUPPLIER_CONTACT.NOT_FOUND);
    });

    test("a contact belongs to its own supplier only", async () => {
        const [first, second] = [await createSupplier(accountant, { name: uniqueName(tag) }), await createSupplier(accountant, { name: uniqueName(tag) })];
        const contact = await createContact(accountant, first.uuid);
        await accountant.api.rejects("PUT", contactPath(second.uuid, contact.uuid), ErrorCodes.SUPPLIER_CONTACT.NOT_FOUND, { name: "Moved" });
        await accountant.api.rejects("DELETE", contactPath(second.uuid, contact.uuid), ErrorCodes.SUPPLIER_CONTACT.NOT_FOUND);
        matches((await getOne(first.uuid))!.contacts, [{ uuid: contact.uuid, name: contact.name }]);
    });

    test("an unknown supplier or contact gives 404, a malformed uuid 422", async () => {
        const supplier = await createSupplier(accountant, { name: uniqueName(tag) });
        await accountant.api.rejects("POST", `${path(randomUuid())}/contacts`, ErrorCodes.SUPPLIER.NOT_FOUND, { name: "X" });
        await accountant.api.rejects("PUT", path(randomUuid()), ErrorCodes.SUPPLIER.NOT_FOUND, { name: uniqueName(tag) });
        await accountant.api.rejects("PUT", contactPath(supplier.uuid, randomUuid()), ErrorCodes.SUPPLIER_CONTACT.NOT_FOUND, { name: "X" });
        await accountant.api.rejectsField("DELETE", contactPath(supplier.uuid, "nope"), "contactUuid");
    });

    // --- List ---

    test("list: sorted by name; filters by search and status; paging", async () => {
        const sub = uniqueName(tag).replace(" ", "");
        const [b, a] = [await createSupplier(accountant, { name: `${sub} B` }), await createSupplier(accountant, { name: `${sub} A` })];
        await accountant.api.ok("PATCH", `${path(b.uuid)}/status`, { status: SupplierStatus.ARCHIVED });
        const uuids = async (params: string) =>
            (await accountant.api.ok<ISupplier[]>("GET", `${PATHS.SUPPLIERS}?pageSize=100&${params}`)).data.map((s) => s.uuid);

        matches(await uuids(`search=${encodeURIComponent(sub.toLowerCase())}`), [a.uuid, b.uuid], "search, sorted by name");
        matches(await uuids(`search=${encodeURIComponent(sub)}&status=${SupplierStatus.ARCHIVED}`), [b.uuid], "status");

        const total = await db.count("suppliers", "company_uuid = $1", [companyA.uuid]);
        const { data, meta } = await accountant.api.ok<ISupplier[]>("GET", `${PATHS.SUPPLIERS}?page=2&pageSize=5`);
        matches(meta, { page: 2, pageSize: 5, total, totalPages: Math.ceil(total / 5) });
        equals(data.length, Math.min(5, total - 5), "items on page 2");
        await accountant.api.rejectsField("GET", `${PATHS.SUPPLIERS}?status=999`, "status");
    });
});
