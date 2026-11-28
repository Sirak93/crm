import {
    AccountType,
    DefaultRole,
    fromAppWallClock,
    KITCHEN_BALANCE_ENABLED,
    MeasureUnit,
    ProductReceivedAs,
    ProductStatus,
    QUANTITY_DECIMALS,
    RECIPE_QUANTITY_DECIMALS,
    RecipeStatus,
    StockInReason,
    StockOutDepartment,
    StockOutReason,
    SupplierStatus,
    toAppWallClock,
} from "armstock-shared";
import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Company } from "../models/Company";
import { Product } from "../models/Product";
import { Recipe } from "../models/Recipe";
import { RecipeLine } from "../models/RecipeLine";
import { Supplier } from "../models/Supplier";
import { User } from "../models/User";
import { StockInBodySchema } from "../schemas/StockInSchema";
import { StockOutBodySchema } from "../schemas/StockOutSchema";
import { StockInService } from "../services/StockInService";
import { StockOutService } from "../services/StockOutService";
import { seedSampleProducts, seedSampleRecipes, seedSampleSuppliers, userByDefaultRole } from "./SampleCatalog";
import recipes from "./data/recipes.json";

const DAY_MS = 24 * 60 * 60 * 1000;
/** How often a by-recipe issue counts on the kitchen balance, like the form does on create. */
const KITCHEN_USE_SHARE = 0.8;

/** How much of a product the store keeps, and its pack size, by unit. */
const STOCK_TARGET: Partial<Record<MeasureUnit, { target: number; pack: number }>> = {
    [MeasureUnit.KILOGRAM]: { target: 40, pack: 1 },
    [MeasureUnit.LITER]: { target: 20, pack: 1 },
    [MeasureUnit.PIECE]: { target: 300, pack: 30 },
    [MeasureUnit.GRAM]: { target: 2000, pack: 500 },
    [MeasureUnit.MILLILITER]: { target: 5000, pack: 1000 },
};
const DEFAULT_TARGET = { target: 50, pack: 1 };

const LARGE_UNITS = [MeasureUnit.KILOGRAM, MeasureUnit.LITER];
const SMALL_UNITS = [MeasureUnit.GRAM, MeasureUnit.MILLILITER, MeasureUnit.MILLIGRAM];

/** The step a delivery comes in: kg / l whole (halves when small), g / ml in hundreds, the rest whole. */
const inStep = (unit: MeasureUnit, value: number) => {
    if (LARGE_UNITS.includes(unit)) return value < 5 ? 0.5 : 1;
    return SMALL_UNITS.includes(unit) ? 100 : 1;
};

/** The step a storekeeper hands out: kg / l finer for small amounts, g / ml in fifties, the rest whole. */
const outStep = (unit: MeasureUnit, value: number) => {
    if (LARGE_UNITS.includes(unit)) return value < 2 ? 0.1 : value < 10 ? 0.5 : 1;
    return SMALL_UNITS.includes(unit) ? 50 : 1;
};

// Float noise is cleared before ceil, else 0.30000000004 / 0.1 would round up to 0.4.
const toStep = (value: number, step: number, up = false) => {
    const steps = Number((value / step).toFixed(6));
    return Number(((up ? Math.ceil(steps) : Math.round(steps)) * step).toFixed(QUANTITY_DECIMALS));
};

const sum = (a: number, b: number, decimals = QUANTITY_DECIMALS) => Number((a + b).toFixed(decimals));

const OTHER_IN_NOTES = ["Նվեր մատակարարից", "Վերադարձ միջոցառումից"];
const OTHER_OUT_NOTES = ["Աշխատակազմի սնունդ", "Համտես", "Փորձնական ճաշատեսակ"];

interface ISimLine {
    productUuid: string;
    quantity: number;
}

interface ISimRecipe {
    uuid: string;
    lines: ISimLine[];
}

const random = (min: number, max: number) => min + Math.random() * (max - min);
const randomInt = (min: number, max: number) => Math.floor(random(min, max + 1));
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const shuffle = <T>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

class Simulation {
    private stock = new Map<string, number>();
    /** Kitchen balance (K) per product: issued to the kitchen minus recipe needs, as the backend sums it. */
    private kitchen = new Map<string, number>();
    /** Received minus returned, per supplier and product - what can still go back. */
    private returnable = new Map<string, Map<string, number>>();
    private stockIns = new StockInService();
    private stockOuts = new StockOutService();
    counts = { stockIns: 0, stockOuts: 0, byRecipe: 0, returns: 0 };

    constructor(
        private companyUuid: string,
        private storekeeperUuid: string,
        private products: Product[],
        private suppliers: Supplier[],
        private recipes: ISimRecipe[],
        private receiverUuids: string[],
    ) {}

    private target = (p: Product) => (STOCK_TARGET[p.measureUnit] ?? DEFAULT_TARGET).target;
    private packSize = (p: Product) => (STOCK_TARGET[p.measureUnit] ?? DEFAULT_TARGET).pack;
    private inStock = (uuid: string) => this.stock.get(uuid) ?? 0;
    private inKitchen = (uuid: string) => this.kitchen.get(uuid) ?? 0;
    private product = (uuid: string) => this.products.find((p) => p.uuid === uuid)!;
    private suppliedBy = (supplier: Supplier) => this.products.filter((_, i) => this.suppliers[i % this.suppliers.length] === supplier);

    private roundIn = (p: Product, value: number) => Math.max(toStep(value, inStep(p.measureUnit, value)), inStep(p.measureUnit, value));
    private roundOut = (p: Product, value: number, up = false) => toStep(value, outStep(p.measureUnit, value), up);

    private packLine(p: Product, wanted: number) {
        const usePacks = p.receivedAs === ProductReceivedAs.PACKS
            || (p.receivedAs === ProductReceivedAs.LOOSE_OR_PACKS && Math.random() < 0.5);
        if (usePacks) {
            const size = this.packSize(p);
            return { productUuid: p.uuid, pack: { quantity: size, unit: p.measureUnit, count: Math.max(1, Math.ceil(wanted / size)) } };
        }
        return { productUuid: p.uuid, pack: { quantity: this.roundIn(p, wanted), unit: p.measureUnit, count: 1 } };
    }

    private async stockIn(date: Date, reason: StockInReason, wanted: Map<Product, number>, supplier: Supplier | null, note: string | null) {
        const body = StockInBodySchema.parse({
            reason,
            date: date.toISOString(),
            supplierUuid: supplier?.uuid ?? null,
            invoiceNumber: supplier && Math.random() < 0.7 ? `INV-${randomInt(100000, 999999)}` : null,
            note,
            lines: [...wanted].map(([p, quantity]) => this.packLine(p, quantity)),
        });
        await this.stockIns.create(this.companyUuid, this.storekeeperUuid, body);
        for (const line of body.lines) {
            this.stock.set(line.productUuid, sum(this.inStock(line.productUuid), line.quantity));
            if (!supplier) continue;
            const map = this.returnable.get(supplier.uuid) ?? new Map<string, number>();
            map.set(line.productUuid, sum(map.get(line.productUuid) ?? 0, line.quantity));
            this.returnable.set(supplier.uuid, map);
        }
        this.counts.stockIns++;
    }

    private async stockOut(date: Date, reason: StockOutReason, lines: (ISimLine & { extraQuantity?: number })[], extra: {
        recipes?: { recipeUuid: string; persons: number }[];
        /** Recipe needs per product - what the kitchen used of this issue. */
        needed?: Map<string, number>;
        supplierUuid?: string;
        note?: string;
    } = {}) {
        if (!lines.length) return;
        const issued = reason === StockOutReason.ISSUED;
        const body = StockOutBodySchema.parse({
            reason,
            date: date.toISOString(),
            supplierUuid: extra.supplierUuid ?? null,
            department: issued ? StockOutDepartment.KITCHEN : null,
            receiverUuid: issued && this.receiverUuids.length && Math.random() < 0.7 ? pick(this.receiverUuids) : null,
            note: extra.note ?? null,
            recipes: extra.recipes ?? [],
            lines: lines.map((l) => ({ productUuid: l.productUuid, quantity: l.quantity, extraQuantity: l.extraQuantity ?? 0 })),
        });
        await this.stockOuts.create(this.companyUuid, this.storekeeperUuid, body);
        for (const line of body.lines) {
            this.stock.set(line.productUuid, sum(this.inStock(line.productUuid), -line.quantity));
            if (!KITCHEN_BALANCE_ENABLED || body.department !== StockOutDepartment.KITCHEN) continue;
            const left = sum(line.quantity, -(extra.needed?.get(line.productUuid) ?? 0), RECIPE_QUANTITY_DECIMALS);
            this.kitchen.set(line.productUuid, sum(this.inKitchen(line.productUuid), left, RECIPE_QUANTITY_DECIMALS));
        }
        this.counts.stockOuts++;
    }

    async initialStock(date: Date) {
        await this.stockIn(date, StockInReason.INITIAL_STOCK, new Map(this.products.map((p) => [p, this.target(p)])), null, null);
    }

    async purchases(times: Date[]) {
        for (const [index, supplier] of shuffle(this.suppliers).slice(0, times.length).entries()) {
            const own = this.suppliedBy(supplier);
            let low = own.filter((p) => this.inStock(p.uuid) < this.target(p) * 0.6);
            if (!low.length) low = shuffle(own).slice(0, randomInt(1, 2));
            if (!low.length) continue;
            const wanted = new Map(low.map((p) => [p, this.target(p) - this.inStock(p.uuid) + this.target(p) * random(0, 0.3)]));
            await this.stockIn(times[index], StockInReason.PURCHASE, wanted, supplier, null);
        }
    }

    async otherStockIn(date: Date) {
        const wanted = new Map(shuffle(this.products).slice(0, randomInt(1, 2)).map((p) => [p, this.target(p) * random(0.05, 0.15)]));
        await this.stockIn(date, StockInReason.OTHER, wanted, null, pick(OTHER_IN_NOTES));
    }

    /**
     * Recipes whose products are in stock. Each total is the need rounded up to a handing-out step; most issues
     * first take what the kitchen already has, like the form does on create.
     */
    async byRecipe(date: Date): Promise<boolean> {
        const useKitchen = KITCHEN_BALANCE_ENABLED && Math.random() < KITCHEN_USE_SHARE;
        const toGive = (uuid: string, need: number) => {
            const left = useKitchen ? Math.max(0, sum(need, -this.inKitchen(uuid), RECIPE_QUANTITY_DECIMALS)) : need;
            return left > 0 ? this.roundOut(this.product(uuid), left, true) : 0;
        };

        let needed = new Map<string, number>();
        const rows: { recipeUuid: string; persons: number }[] = [];
        for (const recipe of shuffle(this.recipes).slice(0, randomInt(1, 4))) {
            const persons = randomInt(5, 40);
            const next = new Map(needed);
            for (const l of recipe.lines) {
                const need = Number((l.quantity * persons).toFixed(RECIPE_QUANTITY_DECIMALS));
                next.set(l.productUuid, sum(next.get(l.productUuid) ?? 0, need, RECIPE_QUANTITY_DECIMALS));
            }
            if (!recipe.lines.every((l) => toGive(l.productUuid, next.get(l.productUuid)!) <= this.inStock(l.productUuid))) continue;
            needed = next;
            rows.push({ recipeUuid: recipe.uuid, persons });
        }
        if (!rows.length) return false;

        const lines = [...needed].map(([productUuid, need]) => ({ productUuid, quantity: toGive(productUuid, need), extraQuantity: 0 }));
        // An extra is a total above the recipes, so only a full issue gets one.
        if (!useKitchen && Math.random() < 0.2) {
            const line = pick(lines);
            const p = this.product(line.productUuid);
            const extraQuantity = this.roundOut(p, this.target(p) * 0.02);
            if (extraQuantity > 0 && sum(line.quantity, extraQuantity) <= this.inStock(line.productUuid)) {
                line.extraQuantity = extraQuantity;
                line.quantity = sum(line.quantity, extraQuantity);
            }
        }
        await this.stockOut(date, StockOutReason.ISSUED, lines, { recipes: rows, needed });
        this.counts.byRecipe++;
        return true;
    }

    /** A few products in stock, each a share of its target. */
    private someLines(count: number, min: number, max: number): ISimLine[] {
        return shuffle(this.products.filter((p) => this.inStock(p.uuid) > 0))
            .slice(0, count)
            .map((p) => ({ productUuid: p.uuid, quantity: this.roundOut(p, Math.min(this.inStock(p.uuid), this.target(p) * random(min, max))) }))
            .filter((l) => l.quantity > 0 && l.quantity <= this.inStock(l.productUuid));
    }

    async manualIssue(date: Date) {
        await this.stockOut(date, StockOutReason.ISSUED, this.someLines(randomInt(1, 4), 0.01, 0.05));
    }

    async writeOff(date: Date) {
        await this.stockOut(date, pick([StockOutReason.DAMAGED, StockOutReason.EXPIRED]), this.someLines(randomInt(1, 2), 0.01, 0.04));
    }

    async otherStockOut(date: Date) {
        await this.stockOut(date, StockOutReason.OTHER, this.someLines(randomInt(1, 2), 0.01, 0.05), { note: pick(OTHER_OUT_NOTES) });
    }

    async supplierReturn(date: Date) {
        const options = [...this.returnable].flatMap(([supplierUuid, map]) =>
            [...map].filter(([uuid, left]) => left > 0 && this.inStock(uuid) > 0).map(([uuid, left]) => ({ supplierUuid, uuid, left })));
        if (!options.length) return;
        const { supplierUuid, uuid, left } = pick(options);
        const p = this.product(uuid);
        const quantity = this.roundOut(p, Math.min(left, this.inStock(uuid), this.target(p) * random(0.02, 0.08)));
        if (quantity <= 0 || quantity > Math.min(left, this.inStock(uuid))) return;
        await this.stockOut(date, StockOutReason.RETURNED, [{ productUuid: uuid, quantity }], { supplierUuid });
        this.returnable.get(supplierUuid)!.set(uuid, sum(left, -quantity));
        this.counts.returns++;
    }
}

/** The active sample recipes (missing ones added first) whose products are all active. */
const ensureRecipes = async (companyUuid: string, products: Product[]): Promise<ISimRecipe[]> => {
    await seedSampleRecipes(companyUuid);
    const found = await AppDataSource.getRepository(Recipe).find({
        where: { companyUuid, status: RecipeStatus.ACTIVE, name: In(recipes.map((r) => r.name)) },
    });
    const lines = found.length
        ? await AppDataSource.getRepository(RecipeLine).find({ where: { recipeUuid: In(found.map((r) => r.uuid)) } })
        : [];
    return found
        .map((r) => ({ uuid: r.uuid, lines: lines.filter((l) => l.recipeUuid === r.uuid) }))
        .filter((r) => r.lines.every((l) => products.some((p) => p.uuid === l.productUuid)));
};

/** A real moment from an Armenian day start and minutes into that day. */
const atMinutes = (dayStart: number, minutes: number) => fromAppWallClock(new Date(dayStart + minutes * 60 * 1000));

/** Times in order, each a random minute between two Armenian hours. */
const timesBetween = (dayStart: number, count: number, fromHour: number, toHour: number) =>
    Array.from({ length: count }, () => randomInt(fromHour * 60, toHour * 60 - 1)).sort((a, b) => a - b).map((m) => atMinutes(dayStart, m));

/**
 * Fills a company with a few months of real-looking use, through the services: sample products, suppliers and
 * recipes (missing ones added), then day by day stock-ins and stock-outs (by recipe, manual, write-offs, returns).
 */
export const seedCompanyData = async (companyUuid: string, months: number) => {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("The company data seeder runs only with NODE_ENV=development");
    }
    if (!(await AppDataSource.getRepository(Company).exists({ where: { uuid: companyUuid } }))) {
        throw new Error(`Company ${companyUuid} not found`);
    }
    const userRepo = AppDataSource.getRepository(User);
    if (!(await userRepo.exists({ where: { companyUuid, accountType: AccountType.COMPANY_OWNER } }))) {
        throw new Error("The company has no owner");
    }

    const started = Date.now();
    const addedProducts = await seedSampleProducts(companyUuid);
    const addedSuppliers = await seedSampleSuppliers(companyUuid);
    const [products, suppliers, members] = await Promise.all([
        AppDataSource.getRepository(Product).find({ where: { companyUuid, status: ProductStatus.ACTIVE }, order: { name: "ASC" } }),
        AppDataSource.getRepository(Supplier).find({ where: { companyUuid, status: SupplierStatus.ACTIVE }, order: { name: "ASC" } }),
        userRepo.find({ where: { companyUuid, accountType: AccountType.COMPANY_MEMBER } }),
    ]);
    if (!products.length || !suppliers.length) throw new Error("The company needs active products and suppliers");
    const simRecipes = await ensureRecipes(companyUuid, products);
    console.log(`Catalog: ${products.length} products (${addedProducts} added), ${suppliers.length} suppliers (${addedSuppliers} added), ${simRecipes.length} recipes`);

    const storekeeper = await userByDefaultRole(companyUuid, DefaultRole.STOREKEEPER);
    const sim = new Simulation(companyUuid, storekeeper.uuid, products, suppliers, simRecipes, members.map((m) => m.uuid));
    const now = new Date();
    const today = toAppWallClock(now);
    const lastDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const firstDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months, today.getUTCDate());
    const notFuture = (dates: Date[]) => dates.filter((d) => d <= now);

    await sim.initialStock(atMinutes(firstDay, 8 * 60));
    for (let day = firstDay; day <= lastDay; day += DAY_MS) {
        await sim.purchases(notFuture(timesBetween(day, randomInt(2, 3), 8, 11)));
        if (Math.random() < 1 / 14) for (const date of notFuture(timesBetween(day, 1, 9, 11))) await sim.otherStockIn(date);

        for (const date of notFuture(timesBetween(day, randomInt(6, 8), 11, 22))) {
            const roll = Math.random();
            if (roll < 0.65) {
                if (!(await sim.byRecipe(date))) await sim.manualIssue(date);
            } else if (roll < 0.88) await sim.manualIssue(date);
            else if (roll < 0.97) await sim.writeOff(date);
            else await sim.otherStockOut(date);
        }
        if (Math.random() < 0.25) for (const date of notFuture(timesBetween(day, 1, 12, 18))) await sim.supplierReturn(date);

        if (new Date(day).getUTCDate() === 1) console.log(`  ${new Date(day).toISOString().slice(0, 7)} ...`);
    }

    const { stockIns, stockOuts, byRecipe, returns } = sim.counts;
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`Done in ${seconds}s: ${stockIns} stock-ins, ${stockOuts} stock-outs (${byRecipe} by recipe, ${returns} returns)`);
};
