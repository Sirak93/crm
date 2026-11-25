# Recipes — Decisions

Everything agreed so far for Recipes and the Stock movement page. This file
changes while we discuss and build. Steps: [tasks.md](tasks.md).

## What it is

A chef writes recipes: which products, and how much of each, one person needs. A
storekeeper then adds recipes and people counts to a stock-out (next to normal product
lines). The app works out the product amounts; the storekeeper can set the actual amounts given.

Not every business cooks, so later this becomes a **module** the platform admin turns on
per company (see "Later → Module switch"). For now only one company uses the platform, so
recipes are open to every company, controlled by permissions only.

To keep adding the module later cheap:

- Recipe routes live in their own router file, so the module check is one line. The recipes
  block in the stock-out form is hidden when the module is off.
- The recipe menu items sit together in `navigation.ts`.

## Chef role

- **Chef** (Շեֆ-խոհարար, head chef) is added to the default roles list (`DefaultRole` /
  `DEFAULT_ROLE_NAMES`), with the 5 recipe permissions.
- **Storekeeper** default role also gets `RECIPE_VIEW` (list and details only - no add,
  edit, archive or delete).
- Letting the owner pick which default roles a new company gets is a **separate, later**
  task.

## Permissions

- New: `RECIPE_VIEW`, `RECIPE_ADD`, `RECIPE_EDIT`, `RECIPE_ARCHIVE`, `RECIPE_DELETE`, in a
  new "Recipes" permission group.
- Anyone who can manage user permissions can grant them.
- Chef needs no `PRODUCT_VIEW`: the product picker uses `/options/products`, which is open
  to every company member.
- New `/options/recipes` (active recipes only), open to every company member.
- Stock-out with recipes has **no new permission**: it is the normal stock-out (`STOCK_OUT_CREATE`,
  `STOCK_OUT_EDIT`, same "only the creator edits" rule).

## Units (fixed list, decided 2026-11-25)

- Units are a **fixed list in code** (shared enum + constant), not per-company data. The
  `measure_units` table, the Units page and the `MEASURE_UNIT_*` permissions go away. Products
  store the unit's enum number.
- The list:

  | Long name | Short | Type | Factor | Decimals | Product unit? |
  | --- | --- | --- | --- | --- | --- |
  | Հատ | հատ | count | - | no | yes |
  | Տուփ | տուփ | count | - | no | yes |
  | Կապ | կապ | count | - | no | yes |
  | Կիլոգրամ | կգ | weight | 1 (base) | yes | yes |
  | Գրամ | գ | weight | 0.001 | yes | yes |
  | Լիտր | լ | volume | 1 (base) | yes | yes |
  | Միլիլիտր | մլ | volume | 0.001 | yes | yes |
  | Միլիգրամ | մգ | weight | 0.000001 | yes | no - converter only |

- **Factor** = how big the unit is next to the base unit of its type (1 գ = 0.001 կգ). Written in
  code only; users never see or change it.
- No package units (Փաթեթ, Շիշ, Բանկա, Պարկ): a package is not a measure. Use kg / l / a count unit
  and type the package size on stock-in (see "Stock-in by packs").
- **Adding a unit later** = a code change + deploy (enum, constant, hy/en names); every company gets
  it. No DB change. Units are never removed or renamed once used.
- **Converter:** wherever an amount is typed in a weight or volume unit, a small unit picker next to
  the field offers the units of the **same type** (kg product → կգ / գ / մգ; l product → լ / մլ). It
  starts on the product's unit. The value is always saved in the product's unit (350 գ → 0.35 կգ).
  Count units get no picker.
- **Rule:** every amount field shows which unit it is typed in, and every amount is saved in the
  product's unit and converted only by the factors in code - so all counting stays correct.

## Products (decided 2026-11-25)

- **Unit = how the product is counted in stock and goes out.** Weighed → Կիլոգրամ, poured →
  Լիտր, counted → Հատ, given as whole boxes / bunches → Տուփ / Կապ. Prefer the big unit (kg, l);
  Գրամ / Միլիլիտր only for tiny items (e.g. saffron).
- **One product per item and per firm** (the accountant needs firms apart). Package sizes do not
  make separate products - "Oil Firm A" is one product for 0.5 l, 1 l and 5 l bottles.
- The product form stays as today; Unit is picked from the fixed list (no Միլիգրամ). No pack size
  on the product.
- A product's unit cannot change once it has stock or documents.
- Examples: Tea Ahmad / Tea Greenfield → Հատ (bags; box of 15 / 30 typed as packs on stock-in), or
  Տուփ if only whole boxes go out; Eggs → Հատ (tray 5 × 30); Ketchup / Mayonnaise → Կիլոգրամ
  (bottle, bucket or soft pack typed as packs); Parsley → Կապ.

## Stock-in by packs (decided 2026-11-25)

- Every stock-in line: **Packs × In one pack = Amount**. Packs and In one pack are typed; Amount is
  calculated, in the product's unit, and is what stock counts.
  ```
  Eggs           5  × 30 հատ    = 150 հատ
  Sunflower oil  6  × 500 մլ    = 3 լ        (converter: 500 մլ → 0.5 լ)
  Mayonnaise     2  × 3 կգ      = 6 կգ
  Meat (loose)   1  × 12.4 կգ   = 12.4 կգ
  ```
- "In one pack" has the converter (see Units). The doc keeps the pack info (packs and pack size)
  so it shows what really came in.
- The same product may be on several lines (0.5 l and 5 l bottles in one delivery) - already allowed
  today.

## Prices (decided 2026-11-25)

- **Removed everywhere**: product, stock-in lines (price, total), stock-out lines, the stock balance
  page (price, value), interfaces, schemas, tests, seed data and texts. Storekeepers do not work
  with prices. The DB columns go away through the models (MVP auto-sync).

## Barcode scanner (decided 2026-11-25)

- **Hidden, not deleted**, by one switch in code (`SCANNER_ENABLED = false`): the header connect
  button, scan in stock-in / stock-out lines, scan search on the products page, and the product's
  **Barcode field** (and any barcode column / search). The DB column and the code stay.
- If it is turned on again later: a scan should add +1 **pack** to the last line with that product
  (stock-in is by packs now) - to confirm then.

## Recipe

- **Name** - required, unique within the company.
- **Note** - optional.
- **Status** - Active / Archived. Archived recipes do not show in the storekeeper's picker;
  old documents still show them.
- **Lines** - at least 1. Product + amount **per 1 person**.
  - Amount is in the **product's own unit** (the unit is shown next to the input). No unit
    conversion - for a product in kg, 100 g is typed as `0.1`.
  - Amount > 0, up to **6 decimals**, for **every** unit - "pcs" too (0.1 egg is allowed). In kg
    that is down to **1 mg** (0.000001), so salt and spices fit. Only recipe amounts get 6 decimals;
    stock, stock-in and stock-out stay at 3.
  - **Converter** next to each amount: the same unit picker as everywhere (see "Units → Converter").
    The amount is always saved in the product's unit.
  - **Small units in recipes:** amounts are per 1 person, so in recipes the picker **starts on the
    small unit** - kg product → գ, l product → մլ (the chef types 5, not 0.005). Count units stay as
    they are. The details popup also shows the small unit ("Salt: 5 գ").
  - Each product once per recipe (the picker hides products already on other rows).
  - A line is **one product** (one firm). If the kitchen switches to another firm's oil, the chef
    edits the recipe. Old documents keep their saved copy, so nothing breaks.
  - A new line needs an **active** product. A line the recipe already had keeps its product
    even if that product was archived later.
- **Delete** - only while the recipe was never used in a stock-out document. Otherwise
  archive.
- No category, photo or price for now.
- Editing a recipe never changes documents already saved (see "Stock out by recipe").
- Recipes list page follows the products page (search, status filter, pagination).
- **Details popup:** "View" in each row's actions, and a row click, open it. Shows name,
  status, note, and all lines as "Product (unit) | per 1 person" (scrolls for long
  recipes). Edit / Archive / Delete stay in the row actions, by permission.

## Stock-out with recipes (one form, decided 2026-11-25)

There is **no separate "Ելք բաղադրատոմսով" form or menu**. The normal stock-out form gets an
optional **Recipes** block. One document can have recipes, extra products, or both. A doc
without recipes is a normal stock-out, like today.

### Recipes block

- Recipe rows: recipe + people count.
- For each picked recipe, the form shows its products with two amounts:
  - **Calculated** - recipe amount × persons (read only).
  - **Actual** - what is really given out. Starts filled with the calculated amount; the
    storekeeper changes it when the real amount differs (e.g. calculated P1 15 g, P2 90 g →
    actual 100 g, 100 g).
- **Stock goes down by the actual amount.** The document keeps both numbers, so the
  difference can be seen later.

### Extra products

- Normal product lines (product + amount), as in today's stock-out form - for products given
  out without a recipe.
- The same product can be both in a recipe and in the extras (oil from Dish A + 2 l extra).
  The document shows them **separately** (recipe part and extras part); stock goes down by the
  **total**.

### From the earlier plan - re-check when the open points below are settled

These were decided for the separate by-recipe form. They probably still hold, but must be
checked against the one-form design before Step 3:

- Each recipe only once per document (hidden in the picker, refused by the backend).
- The first row's persons starts empty; "Add row" copies persons from the row above; empty or
  0 refused (whole number > 0).
- Active recipes only in the picker.
- The document saves which recipes and persons it was made for, plus a **copy** of each
  recipe's amounts that day, so editing a recipe never changes saved documents. Edit
  recalculates rows already in the doc from their saved copy; new rows use the current recipe.
- "By recipe" (Բաղադրատոմսով) mark in the stock-out list for docs with recipes; detail view
  shows the recipes block.
- Preview popup on "Confirm" and the "round up the total" rule (1.1 + 0.5 eggs → 2). With the
  Actual field these may change or go away.
- Same stock check and error list as a normal stock-out.

### Open (stock-out)

- **Reason and department** when the doc has recipes: fixed Issued → Kitchen (suggested) or
  chosen by the user?
- **Actual amount per recipe or per product total?** When 2 recipes use the same product, is
  there one Actual per recipe line, or one per product across all recipes?
- **Converter on stock-out** amounts (type 300 g for a kg product) - suggested yes, not
  confirmed.
- **Kitchen balance** - where the difference between actual and calculated goes (a stock
  balance for the kitchen?). Not defined yet; to discuss.

## Tables

> `stock_out_recipes` / `stock_out_recipe_lines` below were planned for the separate by-recipe
> form. With the one-form design (calculated + actual amounts, recipe part and extras kept apart)
> they will change - redefine at Step 3. `recipes` / `recipe_lines` are built.

`stock_outs` and `stock_out_lines` stay as they are.

```
stock_outs                       (doc - existing)
 ├─ stock_out_lines              (product totals - existing)
 └─ stock_out_recipes            (recipe + persons)
     └─ stock_out_recipe_lines   (copy of the recipe amounts that day)

recipes
 └─ recipe_lines
```

**`recipes`**

| Column | Type | Note |
| --- | --- | --- |
| `uuid` | uuid | PK |
| `company_uuid` | uuid | FK → companies |
| `name` | citext | unique per company, ignoring case (unique key + service check) |
| `note` | text, null | |
| `status` | int | Active / Archived |
| `created_by_uuid` | uuid | FK → users, `RESTRICT` (blocks user delete if one is ever added) |
| `created_at` / `updated_at` | timestamp | |

**`recipe_lines`**

| Column | Type | Note |
| --- | --- | --- |
| `uuid` | uuid | PK |
| `recipe_uuid` | uuid | FK → recipes, deleted with it |
| `company_uuid` | uuid | copied, for queries without a join |
| `product_uuid` | uuid | FK → products, `RESTRICT` (blocks product delete) |
| `position` | int | row order |
| `quantity` | numeric(14,6) | per 1 person, in the product's unit |
| `created_at` / `updated_at` | timestamp | |

Unique: (`recipe_uuid`, `product_uuid`).

**`stock_out_recipes`**

| Column | Type | Note |
| --- | --- | --- |
| `uuid` | uuid | PK |
| `stock_out_uuid` | uuid | FK → stock_outs, deleted with it |
| `company_uuid` | uuid | copied |
| `recipe_uuid` | uuid | FK → recipes, `RESTRICT` (blocks recipe delete) |
| `position` | int | row order |
| `persons` | int | |
| `created_at` / `updated_at` | timestamp | |

Unique: (`stock_out_uuid`, `recipe_uuid`).

**`stock_out_recipe_lines`** - copy of `recipe_lines` at save time, never changed after

| Column | Type | Note |
| --- | --- | --- |
| `uuid` | uuid | PK |
| `stock_out_recipe_uuid` | uuid | FK → stock_out_recipes, deleted with it |
| `company_uuid` | uuid | copied |
| `product_uuid` | uuid | FK → products, `RESTRICT` |
| `position` | int | same order as in the recipe |
| `quantity` | numeric(14,6) | per 1 person, copied that day |
| `created_at` / `updated_at` | timestamp | |

## Names

| What | English | Armenian |
| --- | --- | --- |
| Chef role | Head chef | Շեֆ-խոհարար |
| Recipes menu | Recipes | Բաղադրատոմսեր |
| Mark in the stock-out list | By recipe | Բաղադրատոմսով |
| Stock movement page | Stock movement | Ապրանքների շարժ |

## Stock movement page (Ապրանքների շարժ)

Not part of recipes - works for every company.

- A **separate page**, right under "Stock balance" in the menu. Same permission
  (`STOCK_BALANCE_VIEW`). The balance page stays as it is (stock **now**, price, value).
- Columns:

  | Product | Initial | In | Out | Final |
  | --- | --- | --- | --- | --- |
  | Product 1 (kg) | 40 | 100 | 90 | 50 |

  - Product name with the unit short name in brackets. No code column.
  - **Initial** = all stock-in − all stock-out **before** "from".
  - **In / Out** = sums inside the range.
  - **Final** = initial + in − out.
  - Quantities only (no money for now). No totals row (kg + pcs means nothing).
- Sorted by product name, with pagination.
- Filters: search and category (same as the balance page), date range, and a checkbox
  **"Show products without movement"** (unchecked by default).
  - Unchecked → only products with stock-in or stock-out inside the range.
  - Checked → also products that have stock but no movement in the range.
  - Archived products show when they match, like any other product.
- Date range: the same picker and shortcuts as the stock-in / stock-out lists. Default
  **this month**. Can be cleared: no "from" = from the beginning (initial 0), no "to" = up
  to now (final = current stock).

### Product popup (one product's movement)

- Clicking a table row opens a popup with **all movements of that product** in the
  selected range - every stock-in and stock-out document (all reasons, by recipe included).
  Works for every company.
- Top of the popup (always visible): product (unit), range, and **Initial / In / Out /
  Final** - the same numbers as the table row.
- Below: the list of documents. Columns: date, document number, type / reason, in, out,
  **stock after** (Մնացորդ).

  ```
  Product 1 (kg) · 1–30 Nov 2026
  Initial: 40    In: 100    Out: 90    Final: 50
  ─────────────────────────────────────────────
  Date     Document       Reason     In    Out   Stock after
  03 Nov   IN-2026-0012   Purchase   100         140
  05 Nov   OUT-2026-0015  By recipe        1.6   138.4
    ▸ Dish A × 11 persons   1.1
    ▸ Dish B × 5 persons    0.5
  12 Nov   OUT-2026-0018  Damaged          2     136.4
  ...      (more rows load as you scroll)
  ```

- Sorted by document date, oldest first; same date and time → the one created first.
- **Stock after** = how much was in stock right after that document (initial + each row in
  order). Every row has it.
- **Paging:** 50 rows at a time, more load on scroll. The backend sends each page's
  starting stock, so "stock after" stays correct on every page.
- **By-recipe rows** have an arrow, **closed by default** (one click opens or closes one
  row). Opened: each recipe that used this product, with people count and amount. Amounts
  come from the saved copy (`stock_out_recipe_lines` × persons), so they are exact for that
  day. The recipe amounts are exact; the doc's out amount may be rounded up (e.g. eggs 1.6 →
  2) - both are shown.
- **Document number** is a link that opens the document in a **new browser tab**. Without
  `STOCK_IN_VIEW` / `STOCK_OUT_VIEW` for that kind of document it is plain text.

### Row actions

- Each product row has a row actions menu (`RowActionsMenu`): **View** (opens the popup)
  and **Export** (downloads that product's movement file without opening the popup).
- Clicking the row also opens the popup (same as View).

### Excel export

- Real **.xlsx** files, built on the **backend** - so they include **all rows** matching
  the filters, not only the loaded page. No CSV (Excel breaks Armenian letters in CSV, no
  formatting).
- New backend dependency: **`exceljs`** (approved).
- Where:
  - "Export to Excel" button above the movement table - the whole table with current
    filters and range.
  - **Export** in each row's actions - that product's movement.
  - "Export to Excel" button inside the popup - the same product file.
- Looks professional:
  - Header block: company name, report name, period, generated date.
  - Bold table header, frozen while scrolling.
  - Numbers stored as real numbers with 3 decimals (so they can be summed and filtered).
    Unit in its own column.
  - Fitting column widths.
  - File name like `stock-movement_2026-11-01_2026-11-30.xlsx`.
- Exact layout of each file - first version built as below, then **reviewed together with
  real files after implementation**. Starting point for the table file:

  ```
     A                    B      C         D        E        F
  1  Company LLC
  2  Stock movement
  3  Period: 01.11.2026 – 30.11.2026
  4  Generated: 24.11.2026 14:30
  5  Filters: Category: Meat · Products without movement: no
  6
  7  Product              Unit   Initial   In       Out      Final     ← bold, frozen
  8  Product 1            kg     40.000    100.000  90.000   50.000
  ```

  Texts in the user's chosen app language (hy / en).

### Date on lines

- New column `date` (timestamp) on `stock_in_lines` and `stock_out_lines`, copied from the
  document's `date` (when goods actually moved, not when typed), the same way `company_uuid`
  is copied.
- Index (`company_uuid`, `product_uuid`, `date`), so the report filters lines directly,
  without joining the document tables.
- No extra update when a document's date changes: editing already deletes and re-saves all
  its lines, so they get the new date.
- No real data on the server yet, so no backfill is needed.

## Stock-in and stock-out lists

- Date range filter defaults to **this month** (today it starts empty). Can still be
  cleared or changed.

## Unique names (all tables)

- Names that must be unique per company ignoring case are `citext` columns with a database
  unique key (`company_uuid`, field): `suppliers.name`, `product_categories.name`,
  `products.code`, `measure_units.name` and `short_name`, `roles.name`, `recipes.name`.
- The service still checks first, for a clear error. A same-moment duplicate that gets past
  it is refused by the database and turned into the same "name taken" error
  (`onUniqueViolation`, key names in `UNIQUE_KEYS`).
- The unique key replaces the plain `company_uuid` index on those tables (except products).

## Open - under discussion

Do not build any of this until it is settled.

- **Kitchen balance** - where the difference between actual and calculated recipe amounts goes.
  To discuss / define.
- The stock-out open points listed in "Stock-out with recipes → Open (stock-out)".
- **Unit hint** under the product form's Unit field ("pick the unit it goes out in") - suggested,
  not confirmed.

## Later

- **Module switch** - when a second business type joins. Agreed design:
  - Shared enum `CompanyModule` (`RECIPES = 10`), column `companies.modules int[]`
    default `{}`.
  - Only the **platform admin** turns modules on or off (checkboxes on the company page).
  - Module **off**: the Recipes page, the recipes block in the stock-out form and the Recipes
    permission group are hidden and blocked; editing old by-recipe docs is blocked;
    deleting them stays allowed with `STOCK_OUT_DELETE`.
  - **Always visible:** the Stock movement page, the product popup, and old by-recipe docs
    with their recipe info.
  - Turning it off deletes nothing (recipes, roles, permissions, docs stay). Recipe
    permissions can stay on users while it is off - they just do nothing; saving a user or
    role keeps them.
  - The migration that adds it must turn it **on** for companies already using recipes.
- Owner picks which default roles a new company gets.
- Stock movement in money (initial / in / out / final value), if accountants ask.
