# Recipes & Stock movement — Task List

Each step is one small, finished piece — backend, frontend and tests together — so it can be
reviewed in code, tested, and checked in the browser. One step = one review = one commit.

How to use this file:

- Tick a box (`[x]`) as soon as that item is done, so work can continue in a new session.
- A step is done when all its boxes are ticked, including tests and "Checked in browser".
- **To confirm** = a small open point, settled at the start of that step.

Rules for every step:

- Notes → OK → build (see `CLAUDE.md`).
- Every page has loading, empty, and error states. All texts go through i18n (hy + en).
- Every request body and query is checked with Zod.
- Tests: the backend tester (`npm run test -w armstock-backend`) gets a suite or new cases
  for every endpoint and rule the step adds or changes. All suites pass, not only the new
  ones.
- Lint and build pass for every touched workspace.

Decisions behind these steps: [decisions.md](decisions.md).

## Progress

- [ ] Step 1 — Recipe permissions and Chef role
- [ ] Step 2 — Recipes (backend + UI)
- [ ] Step 3 — Stock out by recipe: create
- [ ] Step 4 — By-recipe docs: list mark and view
- [ ] Step 5 — By-recipe docs: edit
- [ ] Step 6 — Date on stock lines + "this month" default on stock lists
- [ ] Step 7 — Stock movement page
- [ ] Step 8 — Product movement popup
- [ ] Step 9 — Excel export
- [ ] Step 10 — Excel review

---

## Step 1 — Recipe permissions and Chef role

- [ ] Shared
  - [ ] `Permission`: `RECIPE_VIEW`, `RECIPE_ADD`, `RECIPE_EDIT`, `RECIPE_ARCHIVE`,
        `RECIPE_DELETE`
  - [ ] `PermissionGroup`: Recipes
  - [ ] `DefaultRole.CHEF` + its permissions (the 5 recipe permissions)
  - [ ] Storekeeper default permissions + `RECIPE_VIEW`
- [ ] Backend: `DEFAULT_ROLE_NAMES` - Chef (Խոհարար); new companies get it
- [ ] Frontend: permission panel and role dialog show the Recipes group
- [ ] Tests: new company has the Chef role with the right permissions and Storekeeper
      has `RECIPE_VIEW`; permissions and
      roles suites cover the new values
- [ ] Checked in browser: Recipes group in the permission panel, Chef role in the roles list

## Step 2 — Recipes (backend + UI)

- [ ] Shared: `RecipeStatus` enum (Active / Archived), recipe interfaces
- [ ] DB: `recipes`, `recipe_lines` (see decisions.md → Tables)
- [ ] Backend (own router file, so a module check can be added later in one line)
  - [ ] List (search, status filter, pagination), details, create, edit, archive,
        restore, delete
  - [ ] Rules: name unique per company; at least 1 line; product once; amount > 0, up to
        3 decimals for every unit; products must be the company's
  - [ ] Delete only while never used in a stock-out (else archive)
  - [ ] `/options/recipes` - active recipes, open to every member
  - [ ] Product delete blocked while a recipe uses it
- [ ] Frontend
  - [ ] Menu "Recipes" (Բաղադրատոմսեր) - `RECIPE_VIEW`
  - [ ] List page (like products), form with product lines (unit shown next to the
        amount), archive / restore / delete actions
  - [ ] Details popup: "View" row action + row click; name, status, note, all lines
- [ ] Tests: `RecipesSuite` - CRUD, every rule above, permissions, other company's recipe → not found, options endpoint
- [ ] Checked in browser: a chef creates, edits, archives and deletes a recipe; a
      storekeeper opens the list and a recipe's details, with no edit actions

## Step 3 — Stock out by recipe: create

- [ ] DB: `stock_out_recipes`, `stock_out_recipe_lines`
- [ ] Backend
  - [ ] Create endpoint (own router file, `STOCK_OUT_CREATE`): recipe rows + persons, date,
        receiver, note. Reason Issued → Kitchen set by the backend
  - [ ] Rules: at least 1 row; each recipe once; persons whole number > 0; active recipes
        only
  - [ ] Totals per product summed across recipes, rounded **up** only for units without
        decimals; saved as normal `stock_out_lines`
  - [ ] Recipe lines copied into `stock_out_recipe_lines`
  - [ ] Same stock check and product locks as a normal stock-out (same error list)
  - [ ] Preview endpoint (or shared calculation) so the popup shows exactly what will be
        saved
- [ ] Frontend
  - [ ] Menu "Ելք բաղադրատոմսով" - `STOCK_OUT_CREATE`
  - [ ] Form: recipe rows (first row's persons empty, "Add row" copies persons from the
        row above, empty / 0 refused), used recipes hidden in the picker, date,
        receiver, note
  - [ ] "Confirm" checks the form only (no stock check), then opens the preview popup: exact amounts per recipe, totals with "rounded up" mark;
        Save / Back; stock error list shown inside the popup
- [ ] Tests: `StockOutByRecipeSuite` - totals and rounding (incl. 1.1 + 0.5 → 2 for pcs),
      copy saved, duplicates and archived recipes refused, not enough stock,
      permissions, stock balance goes down
- [ ] Checked in browser: create a doc for 2 recipes, see the popup, save

## Step 4 — By-recipe docs: list mark and view

- [ ] Backend: stock-out list and details include the recipe rows and their saved lines
- [ ] Frontend
  - [ ] "Բաղադրատոմսով" mark in the stock-out list
  - [ ] Doc view: recipes block (recipe × persons + per-recipe breakdown) above the lines
- [ ] Tests: details return recipes and copied lines; recipe edited later → doc unchanged
- [ ] Checked in browser: open a by-recipe doc, change the recipe, doc stays the same

## Step 5 — By-recipe docs: edit

- [ ] Backend
  - [ ] Edit endpoint (`STOCK_OUT_EDIT`, creator only): rows already in the
        doc use their saved copy; new rows use the current recipe
  - [ ] Normal stock-out edit refuses a by-recipe doc
  - [ ] Delete works as for any stock-out
- [ ] Frontend: "Edit" on a by-recipe doc opens the by-recipe form with the same popup
- [ ] Tests: edit uses the copy (recipe changed in between), new row uses current recipe,
      normal edit refused, delete works
- [ ] Checked in browser: edit people counts of an old doc after changing its recipe

## Step 6 — Date on stock lines + "this month" default on stock lists

- [ ] DB: `date` on `stock_in_lines` and `stock_out_lines`, index
      (`company_uuid`, `product_uuid`, `date`). No backfill (no real data) - local DB
      recreated
- [ ] Backend: lines get the document date on create and edit (stock-in, stock-out, by
      recipe)
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
