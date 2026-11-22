import { ErrorCodes, type IMeasureUnit, type IProduct } from "armstock-shared";
import { DEFAULT_MEASURE_UNITS } from "../../../../constants/DefaultMeasureUnits";
import { defineSuite } from "../../core/Suite";
import { equals, hasExactKeys, matches } from "../../core/Assert";
import { createUnit, findCategory } from "../../shared/Builders";
import { createCompany } from "../../shared/Companies";
import { PATHS } from "../../shared/Paths";
import { randomUuid, uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

export default (context: ICompanySideContext) => defineSuite("Measure units", (test) => {
    const { db, companyA } = context;
    const { storekeeper } = companyA;
    const path = (uuid: string) => `${PATHS.MEASURE_UNITS}/${uuid}`;
    const shortName = () => uniqueName("u").slice(-8);

    test("a new company starts with the default units", async () => {
        const company = await createCompany(context, "Units");
        const { data } = await company.owner.api.ok<IMeasureUnit[]>("GET", PATHS.MEASURE_UNITS);
        const strip = (u: IMeasureUnit | (typeof DEFAULT_MEASURE_UNITS)[number]) => `${u.name}|${u.shortName}|${u.allowsDecimals}`;
        matches(data.map(strip).sort(), DEFAULT_MEASURE_UNITS.map(strip).sort());
    });

    test("create, trimmed; bad bodies refused", async () => {
        const name = uniqueName("Unit");
        const short = shortName();
        const { data } = await storekeeper.api.ok<IMeasureUnit>("POST", PATHS.MEASURE_UNITS, { name: ` ${name} `, shortName: ` ${short} `, allowsDecimals: true });
        hasExactKeys(data, ["uuid", "name", "shortName", "allowsDecimals"]);
        matches(data, { name, shortName: short, allowsDecimals: true });
        const post = (field: string, body: Record<string, unknown>) => storekeeper.api.rejectsField("POST", PATHS.MEASURE_UNITS, field, body);
        await post("name", { name: "", shortName: shortName(), allowsDecimals: false });
        await post("shortName", { name: uniqueName("Unit"), shortName: "x".repeat(11), allowsDecimals: false });
        await post("allowsDecimals", { name: uniqueName("Unit"), shortName: shortName() });
    });

    test("name and short name are each unique in the company ignoring case; another company may reuse them", async () => {
        const unit = await createUnit(storekeeper);
        await storekeeper.api.rejects("POST", PATHS.MEASURE_UNITS, ErrorCodes.MEASURE_UNIT.NAME_TAKEN,
            { name: unit.name.toUpperCase(), shortName: shortName(), allowsDecimals: false });
        await storekeeper.api.rejects("POST", PATHS.MEASURE_UNITS, ErrorCodes.MEASURE_UNIT.NAME_TAKEN,
            { name: uniqueName("Unit"), shortName: unit.shortName.toUpperCase(), allowsDecimals: false });
        await createUnit(context.companyB.storekeeper, { name: unit.name, shortName: unit.shortName });
    });

    test("edit changes its fields; a taken name is refused, its own names are fine", async () => {
        const [a, b] = [await createUnit(storekeeper), await createUnit(storekeeper)];
        const name = uniqueName("Renamed");
        const { data } = await storekeeper.api.ok<IMeasureUnit>("PUT", path(a.uuid), { name, shortName: a.shortName, allowsDecimals: true });
        matches(data, { uuid: a.uuid, name, shortName: a.shortName, allowsDecimals: true });
        await storekeeper.api.rejects("PUT", path(a.uuid), ErrorCodes.MEASURE_UNIT.NAME_TAKEN, { name, shortName: b.shortName, allowsDecimals: true });
    });

    test("decimals can't be turned off while a product uses the unit; turning them on, or off when free, is fine", async () => {
        const unit = await createUnit(storekeeper, { allowsDecimals: true });
        const fields = { name: unit.name, shortName: unit.shortName };
        const category = await findCategory(storekeeper);
        const { data: product } = await storekeeper.api.ok<IProduct>("POST", PATHS.PRODUCTS,
            { name: uniqueName("Product"), categoryUuid: category.uuid, measureUnitUuid: unit.uuid });

        await storekeeper.api.rejects("PUT", path(unit.uuid), ErrorCodes.MEASURE_UNIT.DECIMALS_IN_USE, { ...fields, allowsDecimals: false });
        await storekeeper.api.ok("PUT", path(unit.uuid), { ...fields, name: uniqueName("Renamed"), allowsDecimals: true });

        await storekeeper.api.ok("DELETE", `${PATHS.PRODUCTS}/${product.uuid}`);
        await storekeeper.api.ok("PUT", path(unit.uuid), { ...fields, allowsDecimals: false });
        const { data } = await storekeeper.api.ok<IProduct>("POST", PATHS.PRODUCTS,
            { name: uniqueName("Product"), categoryUuid: category.uuid, measureUnitUuid: unit.uuid });
        await storekeeper.api.ok("PUT", path(unit.uuid), { ...fields, allowsDecimals: true });
        equals(data.measureUnit.allowsDecimals, false, "the product saw the unit without decimals");
    });

    test("delete: refused while a product uses it; works when free", async () => {
        const unit = await createUnit(storekeeper);
        const category = await findCategory(storekeeper);
        const { data: product } = await storekeeper.api.ok<IProduct>("POST", PATHS.PRODUCTS,
            { name: uniqueName("Product"), categoryUuid: category.uuid, measureUnitUuid: unit.uuid });
        await storekeeper.api.rejects("DELETE", path(unit.uuid), ErrorCodes.MEASURE_UNIT.IN_USE);
        await storekeeper.api.ok("DELETE", `${PATHS.PRODUCTS}/${product.uuid}`);
        await storekeeper.api.ok("DELETE", path(unit.uuid));
        equals(await db.count("measure_units", "uuid = $1", [unit.uuid]), 0, "rows left");
    });

    test("list: every unit of the company, sorted as the database sorts", async () => {
        const { data } = await companyA.staff.api.ok<IMeasureUnit[]>("GET", PATHS.MEASURE_UNITS);
        const ordered = await db.query<{ name: string }>("SELECT name FROM measure_units WHERE company_uuid = $1 ORDER BY name", [companyA.uuid]);
        matches(data.map((u) => u.name), ordered.map((u) => u.name));
    });

    test("an unknown uuid gives 404, a malformed one 422", async () => {
        await storekeeper.api.rejects("PUT", path(randomUuid()), ErrorCodes.MEASURE_UNIT.NOT_FOUND,
            { name: uniqueName("X"), shortName: shortName(), allowsDecimals: false });
        await storekeeper.api.rejects("DELETE", path(randomUuid()), ErrorCodes.MEASURE_UNIT.NOT_FOUND);
        await storekeeper.api.rejectsField("DELETE", path("nope"), "uuid");
    });
});
