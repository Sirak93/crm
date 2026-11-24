# Recipes — Decisions

Everything agreed so far for Recipes and the Stock movement page. This file
changes while we discuss and build. Steps: [tasks.md](tasks.md).

## What it is

A chef writes recipes: which products, and how much of each, one person needs. A
storekeeper then makes a stock-out by picking recipes and people counts, not products.
The app works out the product totals and creates a normal stock-out document.

Not every business cooks, so later this becomes a **module** the platform admin turns on
per company (see "Later → Module switch"). For now only one company uses the platform, so
recipes are open to every company, controlled by permissions only.

To keep adding the module later cheap:

- All recipe routes live in their own router files (recipes, by-recipe stock-out), so the
  module check is one line per router.
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
- Stock out by recipe has **no new permission**: create needs `STOCK_OUT_CREATE`, edit
  needs `STOCK_OUT_EDIT` (same as normal stock-outs, same "only the creator edits" rule).

## Recipe

- **Name** - required, unique within the company.
- **Note** - optional.
- **Status** - Active / Archived. Archived recipes do not show in the storekeeper's picker;
  old documents still show them.
- **Lines** - at least 1. Product + amount **per 1 person**.
  - Amount is in the **product's own unit** (the unit is shown next to the input). No unit
    conversion - for a product in kg, 100 g is typed as `0.1`.
  - Amount > 0, up to 3 decimals, for **every** unit - "pcs" too (0.1 egg is allowed).
  - Each product once per recipe.
- **Delete** - only while the recipe was never used in a stock-out document. Otherwise
  archive.
- No category, photo or price for now.
- Editing a recipe never changes documents already saved (see "Stock out by recipe").
- Recipes list page follows the products page (search, status filter, pagination).
- **Details popup:** "View" in each row's actions, and a row click, open it. Shows name,
  status, note, and all lines as "Product (unit) | per 1 person" (scrolls for long
  recipes). Edit / Archive / Delete stay in the row actions, by permission.

## Stock out by recipe (Ելք բաղադրատոմսով)

### Form (create and edit)

- Recipe rows: recipe + people count. Each recipe only once per document (a used recipe
  is hidden in the picker; the backend refuses duplicates too).
- No general people number. The first row's persons starts **empty**; each "Add row"
  copies the persons number from the row above. Every row can be changed.
- Empty or 0 persons is refused on save - in the form (field marked) and in the backend
  (whole number > 0).
- Date (default now, an earlier date allowed), receiver (optional), note (optional).
- Reason and department are **fixed**: Issued → Kitchen. Not shown in the form.
- No product lines in the form.

### Preview popup

- "Confirm" first checks the form only (at least 1 row, a recipe in every row, persons a
  whole number > 0, date set) - no stock check. Problems → fields marked, no popup.
  All good → it opens a popup:
  - For each recipe: its products and amounts for that people count - **exact**, not
    rounded.
  - Below: **total per product** across all recipes.
- **Rounding:** for units without decimals, only the final total is rounded **up**
  (Dish A 1.1 eggs + Dish B 0.5 eggs = 1.6 → **2**), with a "rounded up" mark. Per-recipe
  rows are never rounded.
- "Save" creates (or updates) the document. "Back" closes the popup.
- Not enough stock → the popup stays open and shows the same error list as the normal
  stock-out (e.g. "P1: only 1.2 kg in stock").

### Document

- A normal stock-out document. Its `stock_out_lines` hold the rounded totals; stock counts
  it like any other stock-out.
- It also stores which recipes and people counts it was made for, and a **copy** of each
  recipe's amounts on that day.
- Shows in the **normal stock-out list** with a "Բաղադրատոմսով" (By recipe) mark.
- Detail view: the normal document, plus a recipes block (recipe × people) with the
  per-recipe breakdown from that day.
- **Edit** opens the by-recipe form, never the normal one. Recipe rows already in the
  document are recalculated from their **saved copy**; newly added rows use the current
  recipe.

## Tables

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
| `name` | varchar | unique per company |
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
| `quantity` | numeric(14,3) | per 1 person, in the product's unit |
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
| `quantity` | numeric(14,3) | per 1 person, copied that day |
| `created_at` / `updated_at` | timestamp | |

## Names

| What | English | Armenian |
| --- | --- | --- |
| Chef role | Head chef | Շեֆ-խոհարար |
| Recipes menu | Recipes | Բաղադրատոմսեր |
| Stock-out menu | Stock out by recipe | Ելք բաղադրատոմսով |
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

## Later

- **Module switch** - when a second business type joins. Agreed design:
  - Shared enum `CompanyModule` (`RECIPES = 10`), column `companies.modules int[]`
    default `{}`.
  - Only the **platform admin** turns modules on or off (checkboxes on the company page).
  - Module **off**: the Recipes page, the "Ելք բաղադրատոմսով" menu and the Recipes
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
