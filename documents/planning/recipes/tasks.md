# Recipes & Stock movement — Task List

Each step is one small, finished piece — backend, frontend and tests together — so it can be
reviewed in code, tested, and checked in the browser. One session = one review = one commit.

How to use this file:

- Tick a box (`[x]`) as soon as that item is done, so work can continue in a new session.
- A step is done when all its boxes are ticked, including tests and "Checked in browser".
- **To confirm** = a small open point, settled at the start of that step.
- **When a step is done**, end the session with: a draft commit message (Conventional
  Commits), and the exact prompt to start the next step in a new session.

Rules for every step:

- Every page has loading, empty, and error states. All texts go through i18n (hy + en).
- Every request body and query is checked with Zod.
- Tests: the backend tester (`npm run test -w armstock-backend`) gets a suite or new cases
  for every endpoint and rule the step adds or changes. All suites pass, not only the new
  ones.
- Lint and build pass for every touched workspace.

Decisions behind these steps: [decisions.md](decisions.md).

## Progress

Work in this order, **one session per line** (a line with two steps = one session, one commit for
both). Start a new session and say which step(s) to do. Smallest first, and each step's code is
read only once.

- [x] Step 1 — Recipe permissions and Chef role
- [x] Step 2a — Recipes: base (enums, tables, interfaces)
- [x] Step 2b — Recipes: list, create, edit, details
- [x] Step 2c — Recipes: archive, restore, delete
- [x] Step U5 — Remove the HR default role  +  Step U2 — Hide barcode scanner and barcode field  *(both small, one session)*
- [x] Step U1 — Remove prices
- [ ] Step U3 — Fixed units (replace the Units page)
- [ ] Step U4 — Stock-in by packs + unit converter
- [ ] Step 2b+ — Recipes: amounts down to 1 mg + unit converter
- [ ] Step 3 — Stock-out: recipes block + totals list (create)
- [ ] Step 4 — Stock-out with recipes: list mark and view
- [ ] Step 5 — Stock-out with recipes: edit and delete
- [ ] Step K — Kitchen balance
- [ ] Step 6 — Date on stock lines + "this month" default on stock lists
- [ ] Step 7 — Stock movement page
- [ ] Step 8 — Product movement popup
- [ ] Step 9 — Excel export
- [ ] Step 10 — Excel review

---

## Step 1 — Recipe permissions and Chef role

- [x] Shared
  - [x] `Permission`: `RECIPE_VIEW`, `RECIPE_ADD`, `RECIPE_EDIT`, `RECIPE_ARCHIVE`,
        `RECIPE_DELETE`
  - [x] `PermissionGroup`: Recipes
  - [x] `DefaultRole.CHEF` + its permissions (the 5 recipe permissions)
  - [x] Storekeeper default permissions + `RECIPE_VIEW`
- [x] Backend: `DEFAULT_ROLE_NAMES` - Chef (Շեֆ-խոհարար); new companies get it; dev seeder
      adds a head chef with login (`DEV_SEED_CHEF_EMAIL`)
- [x] Frontend: permission panel and role dialog show the Recipes group
- [x] Tests: new company has the Chef role with the right permissions and Storekeeper
      has `RECIPE_VIEW`; permissions and
      roles suites cover the new values
- [x] Checked in browser: Recipes group in the permission panel, Chef role in the roles list

## Step 2a — Recipes: base (enums, tables, interfaces)

- [x] Shared: `RecipeStatus` enum (Active / Archived), recipe interfaces (list item,
      details, line)
- [x] DB: `Recipe` and `RecipeLine` models - `recipes`, `recipe_lines` (see decisions.md →
      Tables), with their unique keys, indexes and `RESTRICT` / `CASCADE` foreign keys
- [x] Backend: recipe error codes (not found, name taken, ...) - hy + en client messages
- [x] Tests: the scratch database has both tables with their unique keys and foreign keys
      (product delete blocked by a recipe line at the DB level; a recipe's creator can't be
      deleted)
- [x] Unique names in the database for all tables (`citext` + unique key, see decisions.md
      → Unique names); "Unique names in the database" suite

## Step 2b — Recipes: list, create, edit, details

- [x] Backend (own router file, so a module check can be added later in one line)
  - [x] List (search, status filter, pagination), details, create, edit
  - [x] Zod schemas. Rules: name unique per company (any case); at least 1 line; product
        once; amount > 0, up to 3 decimals for every unit; products must be the company's;
        new lines need active products (an archived one already on the recipe stays)
- [x] Frontend
  - [x] Menu "Recipes" (Բաղադրատոմսեր) - `RECIPE_VIEW`
  - [x] List page (like products), form with product lines (unit shown next to the
        amount)
  - [x] Details popup: "View" row action + row click; name, status, note, all lines
- [x] Tests: `RecipesSuite` - list / details / create / edit, every rule above,
      permissions, other company's recipe → not found
- [x] Checked in browser: the head chef creates and edits a recipe; a storekeeper opens
      the list and a recipe's details, with no edit actions

## Step U1 — Remove prices

- [x] Shared: price / total / value fields out of the stock-in, stock-out and stock balance
      interfaces and payloads
- [x] DB: price columns out of the models (`products` if any, `stock_in_lines` price + total,
      `stock_out_lines`) - local DB recreated
- [x] Backend: schemas, services and options without prices; stock balance without price / value
- [x] Frontend: stock-in form and lines table, stock balance table, `format.ts` money helpers if
      unused; their i18n keys removed (hy + en); dashboard cards without money (Stock balance card,
      product count in latest stock-ins)
- [x] Tests and seed data without prices; tester README updated
- [x] Checked in browser: stock-in form, stock-in doc and stock balance show no prices

## Step U2 — Hide barcode scanner and barcode field

- [x] Frontend: one constant `SCANNER_ENABLED = false`; it hides the header connect button, scan in
      stock-in / stock-out lines, scan search on the products page, the product form's Barcode
      field and any barcode column / search. Code and DB column stay
- [x] Checked in browser: no scanner or barcode anywhere; switch on → all back

## Step U3 — Fixed units (replace the Units page)

- [x] Shared: `MeasureUnit` enum (starts at 10, steps of 10) + constant with long / short name
      (hy + en), type (count / weight / volume), factor, decimals, "product unit" flag - list in
      decisions.md → Units
- [ ] DB: `products.measure_unit_uuid` → unit enum column; `measure_units` model removed - local DB
      recreated
- [x] Backend: `MeasureUnit` routes / controller / service / schema / default units removed;
      `MEASURE_UNIT_*` permissions and their error codes removed; products, options, stock-in,
      stock-out, stock balance and recipes read unit data from the constant
- [x] Frontend: Units page, dialog, table, service and menu item removed; product form picks
      from the fixed list (no Միլիգրամ) with the unit hint under it; everywhere a unit is shown uses the constant; stale i18n
      keys removed
- [x] Tests: `MeasureUnitsSuite` removed; products / stock / recipes suites use the enum; unknown
      or converter-only unit refused for a product
- [x] Seeder uses the enum
- [ ] Checked in browser: products, stock-in, stock-out, balance and recipes show the right units

## Step U4 — Stock-in by packs + unit converter

- [ ] **To confirm first:** how pack info is stored on the line (packs + pack size in the
      product's unit, amount = packs × size)
- [ ] Shared: converter helper - units of the same type, value → product unit by factor
- [ ] DB: `stock_in_lines` gets packs and pack size - local DB recreated
- [ ] Backend: stock-in create / edit / details with packs; amount calculated by the backend;
      Zod rules (packs > 0, pack size > 0, whole numbers for count units)
- [ ] Frontend
  - [ ] Unit converter component: number field + unit picker (same type only, starts on the
        product's unit, none for count units)
  - [ ] Stock-in line: Packs × In one pack (with converter) = Amount (shown only)
  - [ ] Stock-in doc view shows packs × size
- [ ] Tests: amount = packs × size, 500 մլ → 0.5 լ, same product on two lines, count units refuse
      decimals in pack size
- [ ] Checked in browser: 6 × 500 մլ oil → 3 լ in stock

## Step U5 — Remove the HR default role

- [x] Shared: `DefaultRole.HR` and its default permissions removed (enum numbers of the others
      stay)
- [x] Backend: HR out of `DEFAULT_ROLE_NAMES` and the dev seeder; `DEV_SEED_HR_EMAIL` out of
      `.env.example`
- [x] Tests: HR member removed from the tester companies; suites that used HR switch to Staff
- [x] Checked in browser: a new company's roles list has no HR

## Step 2b+ — Recipes: amounts down to 1 mg + unit converter

- [x] ~~To confirm first: fixed units vs editable units~~ - fixed units decided (Step U3)

- [ ] Shared: `RECIPE_QUANTITY_DECIMALS = 6` next to `QUANTITY_DECIMALS`
- [ ] DB: `recipe_lines.quantity` → `numeric(14,6)` (local DB recreated)
- [ ] Backend: recipe line amounts up to 6 decimals (stock documents stay at 3)
- [ ] Frontend
  - [ ] Recipe amount field and details popup show up to 6 decimals
  - [ ] The unit converter component from Step U4 on each amount, **starting on the small
        unit** (գ for kg products, մլ for l products; count units unchanged)
  - [ ] Details popup shows amounts in the small unit (5 գ, not 0.005 կգ)
  - [ ] Form hint: small amounts example ("1 g = 0.001 kg")
- [ ] Tests: 6 decimals saved and returned (e.g. 0.000001), a 7th decimal refused
- [ ] Checked in browser: salt 0.5 g entered through the converter as 0.0005 kg

## Step 2c — Recipes: archive, restore, delete

- [x] Backend: archive, restore, delete
  - [x] Delete only while never used in a stock-out (else archive) - the check is wired
        now, it starts refusing once Step 3 saves by-recipe docs
        (`RecipeService.isUsedInStockOut` - **Step 3 fills in the lookup**)
  - [x] Product delete blocked while a recipe uses it - clear error, not a DB error
- [x] Frontend: archive / restore / delete row actions, by permission
- [x] Tests: archive / restore / delete, permissions, product delete refused while used
- [x] Checked in browser: the head chef archives, restores and deletes a recipe; deleting a
      product used in a recipe shows the error

## Step 3 — Stock-out: recipes block + totals list (create)

Needs Steps U3 (fixed units) and U4 (converter component). Decisions: decisions.md →
"Stock-out with recipes" and "Tables".

- [ ] Shared: interfaces / payload - recipe rows (recipe + persons), extra lines, totals per
      product
- [ ] DB
  - [ ] `stock_out_recipes`, `stock_out_recipe_lines` (`quantity` and `needed_quantity`
        `numeric(14,6)`)
  - [ ] `stock_out_lines`: `extra_quantity`, `department`; unique (`stock_out_uuid`,
        `product_uuid`) - local DB recreated
- [ ] Backend (normal stock-out create, `STOCK_OUT_CREATE`)
  - [ ] Zod: recipes only with reason Issued; Issued → department Kitchen; each recipe once;
        persons whole number > 0; active recipes only; each product once in the totals; total
        ≥ 0; extras ≥ 0
  - [ ] Recipe delete: fill in `RecipeService.isUsedInStockOut` (any `stock_out_recipes` row
        → `RECIPE_IN_USE`); test it
  - [ ] Saves recipe rows + a copy of each recipe's lines (`needed_quantity` = quantity ×
        persons); lines = one row per product (total in `quantity`, extra part in
        `extra_quantity`, doc's department copied)
  - [ ] Totals are taken as sent (the storekeeper's numbers); the backend checks that every
        recipe product has a total line
  - [ ] Same S check and product locks as today
  - [ ] `/options/recipes` - active recipes, open to every member
- [ ] Frontend (the normal stock-out form)
  - [ ] Reason Issued → Department Kitchen preselected and disabled
  - [ ] Recipes block (only enabled with reason Issued): recipe + persons rows, used recipes
        hidden, "Add row" copies persons, calculated amounts shown read-only; any recipe row
        disables Reason
  - [ ] Extra products block (today's lines), with the unit converter
  - [ ] Totals list: each product once, prefilled recipes + extras (count units rounded up,
        kg / l to 3 decimals), editable, ≥ 0, with the unit converter; for every reason
  - [ ] "Save" saves right away; errors in the existing error list popup (no preview popup)
- [ ] Tests (`StockOutSuite` + new cases): recipe with other reason refused, department forced,
      duplicates / archived recipes / persons 0 refused, copy saved with needed amounts, one row
      per product, extra part saved, total 0 allowed, S goes down by totals, options endpoint,
      permissions
- [ ] Checked in browser: doc with 2 recipes + extras, change a total, save

## Step 4 — Stock-out with recipes: list mark and view

- [ ] Backend: stock-out details include recipe rows, their saved lines and `extra_quantity`
- [ ] Frontend
  - [ ] "Բաղադրատոմսով" mark in the stock-out list for docs with recipes
  - [ ] Doc view: recipes block (recipe × persons) and per product Needed | Extra | Given
- [ ] Tests: details return recipes, copied lines and extras; recipe edited later → doc
      unchanged
- [ ] Checked in browser: open a doc with recipes, change the recipe, doc stays the same

## Step 5 — Stock-out with recipes: edit and delete

- [ ] Backend
  - [ ] Edit (`STOCK_OUT_EDIT`, creator only): recipe rows already in the doc use their saved
        copy (even if the recipe was archived); new rows use the current active recipe
  - [ ] Delete works as for any stock-out
- [ ] Frontend: "Edit" opens the same form rebuilt from the doc (recipes, extras from
      `extra_quantity`, totals)
- [ ] Tests: edit uses the copy (recipe changed in between), archived recipe kept on edit, new
      row uses current recipe, extras kept, delete works
- [ ] Checked in browser: edit people counts of an old doc after changing its recipe

## Step K — Kitchen balance

Decisions: decisions.md → "Kitchen balance".

- [ ] Shared: `KITCHEN_BALANCE_ENABLED` switch; kitchen balance row interface
- [ ] Backend
  - [ ] K calculated in SQL, not saved: SUM(lines.quantity where department = Kitchen) −
        SUM(recipe lines.needed_quantity), by company + product
  - [ ] K check next to the S check (same locks) on stock-out create and edit: for every recipe
        product, K + total ≥ recipe needs - error "Product X: not enough for the recipes" in the
        same error list
  - [ ] Stock-out delete gets a K check (refused if K would go below 0)
  - [ ] Kitchen balance list (`STOCK_BALANCE_VIEW`): products with K, search, category,
        pagination
  - [ ] Current K for given products, for the form
- [ ] Frontend
  - [ ] Menu "Խոհանոցի մնացորդ" under Stock balance - read-only table
  - [ ] Stock-out form: "Kitchen: 0.5 l" next to each total; "Use kitchen balance" switch →
        prefill = recipe needs − K (not below 0) + extras, rounded as in Step 3
  - [ ] Switch off in code → page, menu, hints and switch hidden; K checks skipped
- [ ] Tests (`KitchenBalanceSuite`): K after Issued docs with / without recipes, other reasons
      don't touch K, extras stay in K, K + total < needs refused, delete / edit refused when K
      would go below 0, stock-in unaffected, page permissions, other company never counted
- [ ] Checked in browser: 0.9 l oil in K, recipes need 1.5 l, give 5 l → K 4.4 l

## Step 6 — Date on stock lines + "this month" default on stock lists

- [ ] DB: `date` on `stock_in_lines` and `stock_out_lines`, index
      (`company_uuid`, `product_uuid`, `date`). No backfill (no real data) - local DB
      recreated
- [ ] DB: `date` on `stock_out_recipe_lines` too (for a later kitchen report)
- [ ] Backend: lines get the document date on create and edit (stock-in, stock-out lines,
      stock-out recipe lines)
- [ ] Frontend: stock-in and stock-out lists default to this month (still clearable)
- [ ] Tests: lines carry the doc date; changing a doc's date moves its lines' date
- [ ] Checked in browser: both lists open on this month

## Step 7 — Stock movement page

- [ ] Shared: movement row interface
- [ ] Backend (`STOCK_BALANCE_VIEW`): list per product - initial, in, out, final; search,
      category, date range (empty ends allowed), "show products without movement";
      sorted by name, paginated; sums in SQL
- [ ] Frontend
  - [ ] Menu "Ապրանքների շարժ" under Stock balance
  - [ ] Table: "Product (unit)" | Initial | In | Out | Final; filters; default this month
  - [ ] Row actions menu (View / Export) - View opens the popup from Step 8, Export from
        Step 9 (hidden until those steps)
- [ ] Tests: `StockMovementSuite` - numbers for ranges before / inside / after documents,
      empty from / to, checkbox on / off, archived products, filters, permissions, other
      company's data never counted
- [ ] Checked in browser: numbers match the stock-in / stock-out documents

## Step 8 — Product movement popup

- [ ] Backend: one product's documents in the range - date, number, reason, in, out, stock
      after; page starting stock sent with each page; header totals; by-recipe rows with
      their recipe lines (from the copy)
- [ ] Frontend
  - [ ] Opens on row click and "View"
  - [ ] Header: Initial / In / Out / Final
  - [ ] List with "stock after", 50 rows per page loaded on scroll
  - [ ] By-recipe rows closed by default, one click opens
  - [ ] Doc number opens the doc in a new tab (plain text without view permission)
- [ ] Tests: order (date, then created), stock after across pages, recipe lines, same
      numbers as the table row
- [ ] Checked in browser: popup for a product with many documents

## Step 9 — Excel export

- [ ] **New dependency:** `exceljs` in the backend (approved)
- [ ] Backend: two .xlsx endpoints - movement table and one product's movement; same
      filters as the screen, all rows; header block, bold frozen header, real numbers
      with 3 decimals, unit column, column widths, file name with the period; texts in the
      user's language
- [ ] Frontend: "Export to Excel" above the table, "Export" in row actions, button in the
      popup
- [ ] Tests: both endpoints return a valid .xlsx with the expected rows; permissions
- [ ] Checked in browser: files open in Excel with Armenian text

## Step 10 — Excel review

- [ ] Review both files together with real data; adjust layout
- [ ] Decisions.md updated with the final layout
