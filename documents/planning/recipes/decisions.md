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
- **Separate view permissions (decided 2026-11-28).** Kitchen balance and stock movement no
  longer use `STOCK_BALANCE_VIEW`; each has its own permission in the "Stock" group, right
  after the balance one:
  - `KITCHEN_BALANCE_VIEW` (390) - the kitchen balance page and `/stock/kitchen-balance`
    (+ export). Default: Chef, Storekeeper, Accountant. So a chef sees the kitchen, not the
    store. Hidden from the permission panel when `KITCHEN_BALANCE_ENABLED` is off.
    `/options/kitchen-balance` (form picker) stays open to every member.
  - `STOCK_MOVEMENT_VIEW` (400) - the stock movement page and all `/stock/movement` routes
    (+ exports). Default: Storekeeper, Accountant.
  - No update for existing companies' roles - none exist yet; the dev DB is reset.
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
- **The same converter is used on every amount field in the app** (decided 2026-11-26): recipe
  amounts, stock-in Amount (one pack), stock-out extras and stock-out totals. One shared component,
  so the storekeeper learns it once.
- **In code** (Step U3): the API sends only the unit's enum number (`measureUnit`); each app reads
  names, decimals and factor from the shared `MEASURE_UNITS` constant. English short names: pc, box,
  bunch, kg, g, l, ml, mg.
- **Rule:** every amount field shows which unit it is typed in, and every amount is saved in the
  product's unit and converted only by the factors in code - so all counting stays correct.
- **Amounts shown in the unit that reads best** (decided 2026-11-28): below 1 կգ / լ an amount is
  shown in գ / մլ, from 1 կգ / լ in կգ / լ; count units stay as they are (մգ is never picked). Only
  how it is shown - saved values and amount fields stay in the product's unit. One shared helper
  (`formatAmount`). **For now only in the stock-out panels** (Ամփոփում and Ընդհանուր, on the
  form and the details page); tables keep the product's unit and their Unit column.

## Products (decided 2026-11-25)

- **Unit = how the product is counted in stock and goes out.** Weighed → Կիլոգրամ, poured →
  Լիտր, counted → Հատ, given as whole boxes / bunches → Տուփ / Կապ. Prefer the big unit (kg, l);
  Գրամ / Միլիլիտր only for tiny items (e.g. saffron).
- **One product per item and per firm** (the accountant needs firms apart). Package sizes do not
  make separate products - "Oil Firm A" is one product for 0.5 l, 1 l and 5 l bottles.
- The product form stays as today; Unit is picked from the fixed list (no Միլիգրամ). No pack size
  on the product.
- **Unit hint** (decided 2026-11-26): a short line under the Unit field - "The unit the product is
  counted and given out in." (hy + en). The examples (oil → Լիտր, eggs → Հատ) were dropped.
- **Product form layout** (decided 2026-11-26): one field per row, full width - Name, Category, Stock-in
  type, Unit. The **Code / SKU field is hidden** by one switch (`PRODUCT_CODE_ENABLED = false`);
  saved codes and the DB column stay.
- **Defaults in the product form** (decided 2026-11-26): Category is preset to the category of the
  last created product (until the page reloads), else to the first category in the list. Unit is never preset - a
  wrong unit is locked once there is stock. Stock-in type starts on Քանակով.
- A product's unit cannot change once it has stock or documents.
- Examples: Tea Ahmad / Tea Greenfield → Հատ (bags; box of 15 / 30 typed as packs on stock-in), or
  Տուփ if only whole boxes go out; Eggs → Հատ (tray 5 × 30); Ketchup / Mayonnaise → Կիլոգրամ
  (bottle, bucket or soft pack typed as packs); Parsley → Կապ.

## Stock-in by packs (decided 2026-11-25)

- Every stock-in line: **Amount × Count = Total** (order decided 2026-11-26). Amount (one pack)
  and Count are typed; Total is calculated, in the product's unit, and is what stock counts.
  ```
  Eggs           30 հատ    × 5   = 150 հատ
  Sunflower oil  500 մլ    × 6   = 3 լ        (converter: 500 մլ → 0.5 լ)
  Mayonnaise     3 կգ      × 2   = 6 կգ
  Meat (loose)   12.4 կգ   × 1   = 12.4 կգ
  ```
- **Count is a whole number > 0** (decided 2026-11-26). Loose goods: the weight × 1.
  Count is prefilled with 1 on every new line.
- **"Received as" on the product** (decided 2026-11-26, replaces "no received-as field"; not built
  yet): Loose (Չափածո) / In packs (Տուփերով) / Loose or in packs (Չափածո կամ տուփերով). Enum
  `LOOSE = 10`, `PACKS = 20`, `LOOSE_OR_PACKS = 30`; new products start on Loose. The stock-in line
  shows: Loose → only Quantity; In packs → In one pack × Packs; Loose or in packs → In one pack ×
  Packs with Packs prefilled 1. Why: "In one pack" on loose goods (25 kg potatoes) reads wrong.
  - **Wording** (decided 2026-11-26, replaces the names above in the UI): field "Մուտքի ձև"
    (Stock-in type); options with a grey example next to each - Քանակով (25 կգ) /
    Փաթեթով (0.5 լ × 6 շիշ) / Երկուսն էլ (12.4 կգ կամ 5 կգ × 2), each starting with "օր.՝"
    (e.g.). No hint under the field. Stock-in columns: Քանակ | Մեկ փաթեթում | Փաթեթ | Ընդամենը.
    Why: "Չափածո" fits weighed goods only, and "Տուփ" is already a unit (box).
  - **Line table** (Step U4b): columns Quantity | In one pack | Packs | Total. A Loose row fills
    Quantity, the others In one pack × Packs; the other cells show "—". A column shows only while a
    row needs it. A row without a product counts as Loose. A row that has had Packs > 1 (old doc,
    product switch, scan) keeps its pack fields, so they don't vanish while typing.
  - Editable any time, like the name - it changes no amounts or stock.
  - **Form setting only:** the backend saves it on the product but never refuses a stock-in line
    because of it (else an old doc with 6 packs could not be saved after the product turns Loose).
  - Editing an old doc: a line with Packs > 1 keeps showing the pack fields, even for a Loose
    product.
  - Where the maths happens: the browser turns 500 մլ → 0.5 լ and shows the Total while typing;
    the backend works out the saved total (0.5 × 6 = 3) - the browser never sends it.
- **Doc view** (decided 2026-11-26): Count 1 → only the amount (`12.4 կգ`); Count 2+ →
  `500 մլ × 6 = 3 լ`.
- **Storage** (decided 2026-11-26), new columns on `stock_in_lines`:
  - `pack_quantity` `numeric(14,3)` - one pack's amount in the product's unit (0.5)
  - `pack_unit` `int` - `MeasureUnit` it was typed in (մլ), only for showing
  - `pack_count` `int` - the count (6)
  - `quantity` stays = total, calculated by the backend (pack_quantity × pack_count); stock reads
    only `quantity`.
  - **In the API and code** (decided 2026-11-26, Step U4b): nested `pack: { quantity, unit, count }`
    on the line + `quantity` (total). DB columns stay flat (TypeORM embedded). Built with
    `prefix: false` and the full column names on the embedded class: TypeORM's default naming turns a
    `pack_` prefix into camelCase (`packQuantity`), not `pack_quantity`.
- Amount has the converter (see Units). The doc keeps the pack info (packs and pack size)
  so it shows what really came in.
- The same product may be on several lines (0.5 l and 5 l bottles in one delivery) - already allowed
  today.

## Prices (decided 2026-11-25)

- **Removed everywhere**: product, stock-in lines (price, total), stock-out lines, the stock balance
  page (price, value), interfaces, schemas, tests, seed data and texts. Storekeepers do not work
  with prices. The DB columns go away through the models (MVP auto-sync).
- Stock-in list: no "Total" column; its summary keeps documents + products only.
- **Dashboard (decided 2026-11-26):** cards stay, only the money goes. The "Stock value" card
  becomes a "Stock balance" card (products in stock); "Stock-in this month" keeps documents +
  products; "Latest stock-ins" rows show the product count where the money was. Cards and texts
  may be reworked to fit.

## HR role removed (decided 2026-11-26)

- The **HR** default role (Կադրերի մենեջեր, `DefaultRole.HR`) is removed: new companies no longer
  get it; its default permissions, the dev seeder member and `DEV_SEED_HR_EMAIL` go away. Tests
  that used HR as "a user without this permission" use Staff instead.
- The `USER_*` permissions stay - the owner can still give them to any role.

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
  - Amount is saved in the **product's own unit**; it is typed through the converter (below).
  - Amount > 0, up to **6 decimals**, for **every** unit - "pcs" too (0.1 egg is allowed). In kg
    that is down to **1 mg** (0.000001), so salt and spices fit. Only recipe amounts get 6 decimals;
    stock, stock-in and stock-out stay at 3.
  - **Max amount** (decided 2026-11-26): `recipe_lines.quantity` is `numeric(14,6)`, so only 8
    digits fit before the dot. Recipe lines use their own `RECIPE_QUANTITY_MAX = 99_999_999`
    (shared, next to `RECIPE_QUANTITY_DECIMALS = 6`); `QUANTITY_MAX` stays for stock documents. A
    bigger column would not help - JS numbers can't hold 11 + 6 digits exactly.
  - **Decimals check** (2026-11-26): the backend checks decimals by round-trip
    (`Number(v.toFixed(n)) === v`), not `v * 10^n`, which refused some large 6-decimal amounts
    because of float noise. Same check for stock documents.
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
- **Archive / restore** - `PATCH /recipes/:uuid/status` (`RECIPE_ARCHIVE`), like products.
  Delete - `DELETE /recipes/:uuid` (`RECIPE_DELETE`); its lines go with it.
- **A product used in any recipe** (active or archived) can't be deleted: error
  `PRODUCT_IN_RECIPE` ("remove it from the recipes or archive the product"). Archiving the
  product is still allowed.
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

- Recipe rows: recipe + people count. The app calculates each recipe's product amounts
  (recipe amount × persons, read only).

### Extra products

- **One place for amounts (decided 2026-11-27, replaces "product + amount" lines):** the Extras
  block only adds products that are in no recipe. Every amount is the product's total; an extras
  product starts with an empty total that must be filled in.
- **Amount on the extras row (decided 2026-11-27):** an extras row has product + amount + remove
  again, but its amount field *is* that product's total (no recipe part), not a separate number -
  typing there or in the totals panel changes the same value. Recipe products are never in the
  extras, so their amount is changed only in the totals.
- **Extra is worked out, not typed:** extra = total − recipes (rounded up), when above 0; saved
  in `extra_quantity` as before. 17.5 eggs → 18; typed 20 → extra 2 (count units stay whole).
- **Changing recipes or people resets** the totals of the products they feed back to the
  calculated amount; the storekeeper checks the totals before saving.
- Backend and DB unchanged. A saved doc opens the same way: its extras block lists the products
  with no recipe part, every total comes back as saved.

### Totals - one Actual per product (decided 2026-11-26)

- Below recipes and extras the storekeeper sees a **totals list: each product of the doc
  once**, prefilled with recipes + extras summed. The storekeeper changes any total to what is
  really given out (they can't always give exactly what the recipe needs), then submits.
  ```
  Recipe 1:  P1 0.5 l, P2 0.7 l
  Recipe 2:  P2 0.8 l, P3 2 kg
  Extras:    P4 1 kg, P1 0.7 l
  Totals:    P1 1.2 l, P2 1.5 l, P3 2 kg, P4 1 kg   ← editable
  ```
- **Stock goes down by the totals.** The doc keeps the recipe and extras amounts too, so the
  difference can be seen later.
- **Changed totals are marked (decided 2026-11-27):** when a total is not the prefill (recipes +
  extras, rounded up), a small `(+2)` / `(−1)` shows next to it - in the form and in the doc view.
  Rows that match show nothing. Since extras are worked out from the total, the form only ever
  shows `(−1)` (a total below the recipes); `(+2)` stays for older docs in the view.
- **Summary panel (decided 2026-11-27):** stock-out form and the view of a doc with recipes show a
  panel on the right (sticky on wide screens, below the page on small ones): each recipe with its
  people and amounts, then the extra products, with recipe and product counts. Read only. Recipe
  rows in the form are one line (recipe, people, remove); their amounts show only in the panel.
- **Totals panel (add / edit only, decided 2026-11-27):** the totals table is replaced by a second
  panel in the same style: each product once, no groups, compact rows - a click opens a row's total
  to change, with the recipe / extra parts and the mark. Save and Cancel live at its bottom.
  1600px+: summary and totals side by side on the right, both sticky. 1200-1599px: summary sticky
  on the right, totals under the rows. Smaller: one column.
- Same totals list for every stock-out reason (e.g. Returned - then it is just the extras).
- Total can be **0 or more** (0 = listed but nothing given, e.g. the kitchen still has salt).
  Recipe products stay in the doc as they are. The doc's existing **Note** field is for any
  explanation. Stock is checked on the **backend only**, with the existing
  error list popup.

### Recipe rows and saving (re-checked for the one form, 2026-11-26)

- Each recipe only once per document (hidden in the picker, refused by the backend).
- The first row's persons starts empty; "Add row" copies persons from the row above; empty or
  0 refused (whole number > 0). Most persons per row: **1000** (`RECIPE_PERSONS_MAX`, decided 2026-11-26).
- Active recipes only in the picker. On edit, a recipe already in the doc stays even if it
  was archived later (same as products on recipe lines).
- The document saves which recipes and persons it was made for, plus a **copy** of each
  recipe's amounts that day, so editing a recipe never changes saved documents. Edit
  recalculates rows already in the doc from their saved copy; new rows use the current recipe.
- "By recipe" (Բաղադրատոմսով) mark in the stock-out list for docs with recipes; detail view
  shows the recipes block.
- **Recipe name on old docs (decided 2026-11-26):** the saved copy keeps the amounts, not the
  name - a doc shows the recipe's **current** name (renamed "Soup" → "Chicken soup" shows the new
  name). Amounts and persons never change.
- **Rounding (decided 2026-11-26):** the prefilled total is rounded **up** for count units
  (1.1 + 0.5 eggs = 1.6 → 2); kg / l to 3 decimals. The storekeeper can still change it.
  The rest goes to K, so K can hold parts of a count unit (0.4 egg) - recipe needs are exact.
- **kg / l round up too (decided 2026-11-26):** recipe needs have up to 6 decimals, stock totals
  only 3, so the prefilled kg / l total is rounded **up** to 3 decimals (0.0012 kg → 0.002 kg),
  never down - the prefill never gives less than the recipes need. The rest (0.0008 kg) goes to K.
- **Nothing is lost by rounding:** only the prefill is rounded. The saved total is exact (3
  decimals), recipe needs are saved exact (6 decimals), and K = totals − needs is summed in SQL
  (`numeric`, no float errors). So came in = in store + in kitchen + used by recipes, always.
- **Float noise:** the form clears it before rounding up (e.g. `toFixed(6)` first), so 0.5 × 3 =
  1.5000000001 does not become 1.501.
- **No preview popup (decided 2026-11-26):** the totals list is the preview. "Save" saves right
  away; stock / kitchen errors show in the existing error list popup.
- Same stock check and error list as a normal stock-out.
- **Payload (built in Step 3):** `recipes: [{ recipeUuid, persons }]` and `lines` = the totals list,
  one per product: `{ productUuid, quantity (total), extraQuantity (sum of that product's extras) }`.
  The form sums the extras per product; the backend copies the recipe lines itself. `/options/recipes`
  returns active recipes with their lines, so the form works out the amounts.

### Reason and department (decided 2026-11-26)

- Department is a fixed enum (`StockOutDepartment`, only `KITCHEN` today). When the reason is
  **Issued**, Department is **Kitchen, preselected and disabled** (with or without recipes).
- Recipes can be picked **only when the reason is Issued**. With any other reason the recipe
  picker is disabled.
- Once a recipe is picked, the **Reason field is disabled** (stays Issued). Removing all recipe
  rows enables it again. Same on edit of a doc with recipes.
- The **backend** enforces it too: a doc with recipes and a reason other than Issued is refused;
  department must be Kitchen.

### Kitchen balance (decided 2026-11-26)

- Two stocks: **S** (store) and **K** (kitchen balance, per product). K = what the kitchen got
  but did not need yet. No one edits K by hand; no new roles.
- Every **Issued** doc (Department = Kitchen), with or without recipes, does:
  **S − totals; K + totals − recipe needs**. Other reasons (Returned, Damaged, ...) never touch K.
  - So **extras stay in K** (no recipe used them). Staff food is not an extra: its people are
    counted in the recipe persons, so K stays right without manual fixes.
  - Example: K has 0.9 l oil, recipes need 1.5 l, only a 5 l bottle can be given →
    0.9 + 5 − 1.5 = 4.4 l. K can go up or down.
- **No switch - K in the prefill on create only (decided 2026-11-28, replaces the "Use kitchen
  balance" switch).** The form shows K next to each product (e.g. "Kitchen: 0.5 l"), on create
  and edit.
  - Create: prefilled totals = recipe needs − K (not below 0); the storekeeper can still change
    them.
  - Edit: the saved totals come back as saved; a prefill that is worked out again (recipe or
    persons changed) is the full need, without K - today's K has later docs in it, so using it
    would rewrite an old doc with stock that came after it. With the flag on, the storekeeper
    checks all totals by hand against the "Kitchen" hint after a change.
  - Only the prefill changes - frontend only. The backend saves the final totals and checks S
    and K as before; K changes after every Issued doc.
- **K never goes below 0**, like S. If for a product K + total < recipe needs, the doc is
  refused (backend) with "Product X: not enough for the recipes", in the same error list popup
  as the stock errors.
- **Checks:**
  - Stock-out create / edit: the existing S check stays; the K check is added next to it (same
    product locks).
  - Stock-out edit / delete recalculates K and is refused if the current K would go below 0
    (e.g. deleting an old doc whose oil a later doc already used). Today stock-out delete has
    no check (it only gives stock back to S) - it gets this K check.
  - Stock-in docs never touch K: their checks stay as they are (S only).
- **How K is built (decided 2026-11-26):**
  - **Calculated from the docs, not saved** as its own number/table - the same way S is
    calculated today from the lines (sums in SQL by company + product index). Always right,
    nothing to keep in sync. A saved balance table only later, if data ever gets very big.
  - `stock_out_recipe_lines` gets a **`date`** column (copied from the doc, like the stock
    lines in Step 6), so a later kitchen movement report (Start / In / Out / End) filters it
    without joining the docs.
  - One code switch **`KITCHEN_BALANCE_ENABLED`** (like `SCANNER_ENABLED`). Off → no Kitchen
    balance page, no switch / hints in the form, no K checks. Docs and data stay.
- **Kitchen balance page** (Խոհանոցի մնացորդ): read-only table, no actions. In the menu right
  under "Stock balance", own permission `KITCHEN_BALANCE_VIEW` (see Permissions).
- **Built (Step K, 2026-11-27):**
  - Page: `GET /stock/kitchen-balance` - products with K above 0 (archived too), search, category,
    paging. Same row shape as the stock balance (`IStockBalance`), so the table is reused.
  - Form: `GET /options/kitchen-balance` - every product with K above 0 (`IKitchenQuantity`),
    open to every member like the other form pickers (an edit-only user still sees it). Loaded once
    with the form; on edit the form takes the doc's own part (given − needed) back out.
  - Error `STOCK_KITCHEN_NOT_ENOUGH` with the same product list as "not enough stock": on save the
    amount is K + this doc's total, on delete it is K as it is now.
  - The form shows "Kitchen: X" only for reason Issued.
- **Turning the flag off and on (decided 2026-11-28):** safe, no data lost, no reset. K is always
  calculated from all docs, so it keeps counting while `KITCHEN_BALANCE_ENABLED` is off and shows
  those months when it is on again. S never depends on the flag. A product whose K went below 0
  while off (no K check then) has its docs refused until K is back to 0 or above.
  - Later: a way to reset K (e.g. a kitchen stock-out doc) - not designed yet.

## Tables

Stock-out tables decided 2026-11-26 for the one-form design. `recipes` / `recipe_lines` are
built.

`stock_outs` stays as it is. `stock_out_lines` = the **totals**, one row per product (S reads
`quantity` as today), with new columns below.

```
stock_outs                       (doc - existing)
 ├─ stock_out_lines              (one row per product: total + extra part)
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

**`stock_out_lines`** - new columns (the rest as today)

| Column | Type | Note |
| --- | --- | --- |
| `quantity` | numeric(14,3) | existing - the **total** really given; S reads it |
| `extra_quantity` | numeric(14,3) | part typed as extra (no recipe), 0 if none. Not used in any sum - kept so the doc view and edit show what was typed |
| `date` | timestamp | copied from the doc (Step 6) |
| `department` | int, null | copied from the doc (Kitchen or null), so K sums without a join |

Unique: (`stock_out_uuid`, `product_uuid`) - **one row per product** (today the same product may
be on two lines; extras of the same product are summed).

**`stock_out_recipe_lines`** - copy of `recipe_lines` at save time, never changed after

| Column | Type | Note |
| --- | --- | --- |
| `uuid` | uuid | PK |
| `stock_out_recipe_uuid` | uuid | FK → stock_out_recipes, deleted with it |
| `company_uuid` | uuid | copied |
| `product_uuid` | uuid | FK → products, `RESTRICT` |
| `position` | int | same order as in the recipe |
| `quantity` | numeric(14,6) | per 1 person, copied that day |
| `needed_quantity` | numeric(14,6) | quantity × persons, so K sums without a join |
| `date` | timestamp | copied from the doc, for a later kitchen report |
| `created_at` / `updated_at` | timestamp | |

**Sums:**

- **S** = stock-in − SUM(`stock_out_lines.quantity`) - as today.
- **K** = SUM(`stock_out_lines.quantity` where department = Kitchen) −
  SUM(`stock_out_recipe_lines.needed_quantity`).
- Doc view per product: Needed (recipe lines) | Extra | Given (total).

Example: Recipe A × 10 (P1 0.05 l, P2 0.2 kg per person) + extras P3 1 kg, P1 0.3 l; the
storekeeper sets P1 total to 1 l → lines P1 (extra 0.3, total 1), P2 (0, 2), P3 (1, 1);
recipe lines P1 needed 0.5, P2 needed 2 → S: −1, −2, −1; K: P1 +0.5, P2 0, P3 +1. A total
below needed + extra is allowed (only K + total ≥ recipe needs); the Note explains why.

## Names

| What | English | Armenian |
| --- | --- | --- |
| Chef role | Head chef | Շեֆ-խոհարար |
| Recipes menu | Recipes | Բաղադրատոմսեր |
| Mark in the stock-out list | By recipe | Բաղադրատոմսով |
| Stock movement page | Stock movement | Ապրանքների շարժ |

## Stock movement page (Ապրանքների շարժ)

Not part of recipes - works for every company.

- A **separate page**, right under "Stock balance" in the menu. Own permission
  `STOCK_MOVEMENT_VIEW` (see Permissions). The balance page stays as it is (stock **now**).
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
  - **Kept on purpose** (re-checked 2026-11-27): it is the only way to see the stock of every
    product on a past date (the balance page shows stock now only), which the Excel export
    needs for period-end reports. The name stays as it is.
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
- **Paging:** 50 rows at a time, more load on scroll. "Stock after" stays correct on every
  page: the backend works it out in SQL as a running sum over all the product's documents in
  the range (window function), then cuts the page - so each row already has its own value.
- **By-recipe rows** have an arrow, **closed by default** (one click opens or closes one
  row). Opened: each recipe that used this product, with people count and amount. Amounts
  come from the saved copy (`stock_out_recipe_lines` × persons), so they are exact for that
  day. The recipe amounts are exact; the doc's out amount may be rounded up (e.g. eggs 1.6 →
  2) - both are shown.
- **Opened recipes - full-width row (decided 2026-11-27):** a row under the document spanning
  the whole table, one line per recipe: "Dish A × 11 persons" on the left, amount + unit on
  the right. Long names wrap, nothing is cut (before, they sat in the narrow reason column
  with "…"). The row has a chef-hat icon (`RecipeIcon`, like the stock-out list) instead of a
  "By recipe" text badge.
- **One scroll only:** the table has no height of its own; the popup body is the only
  scroll (the next page still loads when the end scrolls into view).
- Endpoint: `GET /stock/movement/:uuid` (`STOCK_MOVEMENT_VIEW`), same range as the table.
  Each page also sends the header numbers (the product's movement row). A stock-in that has
  the product on two lines is one row (summed).
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
  - File name like `stock-movement_2026-11-01_2026-11-30.xlsx`. Without a period (all
    time) the export day is used instead: `stock-in_2026-11-27.xlsx` (decided in Step 10).
- Exact layout of each file - first version built as below, then **reviewed together with
  real files after implementation**. Starting point for the table file:

  ```
     A                    B      C         D        E        F
  1  Company LLC                         Period: 01/11/2026 – 30/11/2026   ← right-aligned in F
  2  Stock movement                             Generated: 24/11/2026 14:30
  3  Filters: Search: … · Category: Meat     (only when search or category is set)
  4
  5  Product              Unit   Initial   In       Out      Final     ← bold, frozen
  6  Product 1            kg     40.000    100.000  90.000   50.000
  ```

  Texts in the user's chosen app language (hy / en). The "products without movement"
  checkbox is not written in the file.
- Product file: company, "Product movement", product (unit) on the left; period and generated
  on the right; table starts with an "Initial stock" row and ends with a bold "Total" row.
- The frontend sends the app language as a `lang` query value (hy / en) - the backend does not
  store it.
- Dates in the file (period, generated, file name) are in **Armenian time** (`Asia/Yerevan`,
  shared `APP_TIME_ZONE`), shown as `DD/MM/YYYY` like on screen.
- File texts (report name, period, column headers) live in the backend with `hy` / `en`.
- Stock-in / stock-out **reason names** move to shared as `{ hy, en }` (like unit names), so
  the backend file and the frontend use one copy; their keys leave the locale files.

### Excel export for the lists (Step 9b)

- "Export to Excel" on the stock-in list, stock-out list, stock balance and kitchen balance
  pages. Same header block as the movement files (used by every file); the page's current
  filters; all rows.
- Columns:
  - Stock-in and stock-out are **nested**: a bold document row, then its product lines
    under it as an Excel group (+/- on the document row). Groups are **open** when the file
    opens (closing them by default is a small change later).

    ```
    Number        Date              Reason    Supplier    Created by  Product  Unit  Quantity
    IN-2026-0012  05/11/2026 10:30  Purchase  Supplier A  Anna                          ← bold
                                                                      Apple    kg    10.000
                                                                      Bean     kg     5.000
    ```

  - Stock-in document row: number, date, reason, supplier, created by.
  - Stock-out document row: number, date, reason ("(by recipe)" added when made with
    recipes), where to (supplier, or department · receiver), created by. Line quantity is
    the line's total.
  - Stock balance: product, code, category, unit, quantity.
  - Kitchen balance: product, category, unit, quantity (up to 6 decimals, like the page).
- Header: stock-in / stock-out have period and generated time on the right; the balances
  only the generated time (they show stock now). Filters line only for filters that are
  set (reason, supplier, receiver / search, category); switches like "in stock only" are
  not written.
- Permissions: the page's own view permission (`STOCK_IN_VIEW`, `STOCK_OUT_VIEW`,
  `STOCK_BALANCE_VIEW`).
- Stock-out **department names** move to shared as `{ hy, en }`, like the reason names.

### Excel: row limit, recipes, single document (Step 9c)

- **Row limit:** at most **20,000** main rows per file (products, or documents) -
  `EXPORT_MAX_ROWS`. Counted before anything is loaded; above it the request is refused
  (`EXPORT_TOO_MANY_ROWS`) and the user sees "choose a shorter period or more filters".
  Keeps the server safe and stays under Postgres' limit on `IN (...)` lists.
- **Product movement file:** a by-recipe stock-out row gets its recipes nested under it
  (open group), like the popup: "Dish A × 11 persons" and the exact recipe amount in the
  Out column (up to 6 decimals). The Total row is not changed by them.

  ```
  Date              Document       Reason               Out     Stock after
  05/11/2026 10:30  OUT-2026-0015  Issued (by recipe)   2.000   138.000    ← bold
                                   Dish A × 11 persons  1.100
  ```

- **Look of every file:**
  - Nested rows (recipes, a document's products) are **indented**. Only the stock-in /
    stock-out list files bold their document rows (every one of them heads a group);
    elsewhere no row is bold just because it has nested rows.
  - Amounts with up to 6 decimals (recipe amounts, kitchen balance) show 3 decimals, and
    more only when the amount has them: `0.300`, `0.000125`.
  - Column widths fit their content; the last column also fits the right-side header
    (period, generated), so nothing runs past it.
- **Single document:** "Export to Excel" on the stock-in and stock-out view pages; the
  document's view permission.
  - Header block: company, "Stock in IN-…" / "Stock out OUT-…", then the details one per
    row (date, reason, supplier / where to, invoice, created by, note - empty ones left
    out); generated time on the right.
  - Stock-in table: product, unit, pack (e.g. "2 × 5 kg"), quantity. The pack column only
    when some line came in more than one package.
  - Stock-out table: product, unit, quantity; by-recipe documents get each product's
    recipes nested under it (name × persons, amount).

### Excel review (Step 10)

- The review covers **all 8 files** together (not only the 2 movement files), so they
  share one layout: stock movement, product movement, the 4 list files, and the 2
  single-document files.
- Real data comes from a dev-only script, `npm run seed:company-data -- <companyUuid> [months]`
  (default 6). It goes through the services, so every rule applies. It adds the sample
  products, suppliers and about 16 recipes the company is missing, then day by day: about
  2–3 purchases and 6–8 stock-outs (mostly by recipe, plus manual issues, write-offs,
  "other", and a few supplier returns). Used for the Excel review and API speed tests.
- **Result (2026-11-27):** all 8 files reviewed with seeded data - the layouts described in
  the Excel sections above are final. The only change was the file name without a period
  (export day added).
- **Seed recipes (decided 2026-11-28):** the dev seeder (`npm run seed:dev`) also adds the
  sample recipes, so a fresh database starts with them. Both seeders create recipes as the
  company's default-role Chef; if the company has none, as the Owner.
- **Seed stock movements (decided 2026-11-28):** the company data seeder makes every stock-in
  and stock-out as the company's default-role Storekeeper; if the company has none, as the
  Owner. Receivers on kitchen issues stay random members.
- **Seed amounts like real ones (decided and built 2026-11-28):** at most 2 decimals.
  - Stock-ins (purchases, "other", loose lines): kg / l whole (0.5 steps under 5), g / ml steps
    of 100, pieces whole. Packs stay as count × pack size.
  - Stock-outs: by recipe the need rounded **up**, manual / write-off / other / returns rounded
    to the nearest step - kg / l steps of 0.1 under 2, 0.5 under 10, 1 above; g / ml steps of
    50; pieces whole. No random +0–8% on top of the recipe need.
  - Kitchen balance (when `KITCHEN_BALANCE_ENABLED`): the seeder tracks K like the backend, and
    about 80% of by-recipe issues use it (need − K, not below 0, like the form switch). Manual
    issues to the kitchen are smaller (1–5% of the product's target instead of 3–12%).
    An extra (2% of the target on one line) is added only to issues that did not use K.
- Roles keep no link to their default role, so the seeders find the Chef and Storekeeper by
  the default role name (`DEFAULT_ROLE_NAMES`); a renamed role counts as missing.

## Armenian time everywhere

- The whole app shows and picks dates in **Armenian time** (`Asia/Yerevan`), not the
  browser's time zone - same numbers for users abroad and in the Excel file.
- Armenia is always UTC+4 (no summer time), so no new package is needed.
- Document number year also comes from Armenian time (today from the server clock, so a doc
  saved on 1 Jan 00:00–04:00 gets last year's number).
- Done in Step T, right after the Excel export.

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
- **Measure stock queries on big data** (raised 2026-11-27). The stock balance, stock movement
  and kitchen balance pages (and `/options/kitchen-balance`) sum **all** of a company's lines
  on every open, so they grow with its history. Save checks only sum the document's products
  (index), so they stay cheap. Before real data grows: fill a test database with about 3 years
  of documents, run `EXPLAIN ANALYZE`, and fix only what is slow. Likely fixes, small to big:
  1. `INCLUDE (quantity)` on the line indexes (index-only reads).
  2. Sum only the products of the current page, not all products.
  3. A monthly closing balance table - initial = last saved month + lines since.
