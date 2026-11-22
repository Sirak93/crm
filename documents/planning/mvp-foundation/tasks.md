# MVP Foundation — Task List

Each step is one small, finished piece — backend and frontend together — so it can be
reviewed in code and checked in the browser. One step = one review = one commit.

How to use this file:

- Tick a box (`[x]`) as soon as that item is done, so work can continue in a new session.
- A step is done when all its boxes are ticked, including "Checked in browser".
- **To confirm** = a small open point, settled at the start of that step.

Rules for every step:

- Every page has loading, empty, and error states. All texts go through i18n.
- Every request body is checked with Zod.

Decisions behind these steps: [decisions.md](decisions.md).

## Progress

- [x] Step 1 — Skeleton
- [x] Step 2 — Login
- [x] Step 3 — Platform tools: Database + Logs
- [x] Step 4 — Companies
- [x] Step 5 — Users
- [x] Step 6 — Units
- [x] Step 7 — Product categories
- [x] Step 8 — Products
- [x] Step 9 — Suppliers
- [x] Step 10 — Stock-in documents
- [x] Step 11 — Stock view
- [x] Step 12 — Archived users
- [x] Step 13 — Stock-out documents
- [ ] Step 14 — User permissions
- [ ] Step 15 — Backend tester

---

## Step 1 — Skeleton

- [x] List new packages and get approval before install
- [x] Root `package.json`
  - [x] npm workspaces: `armstock-assets`, `-shared`, `-backend`, `-frontend`
  - [x] `dev` script that starts everything together
  - [x] `dev:backend` and `dev:frontend` scripts
- [x] Run scripts (Node 22 via nvm, install if missing): `run.sh` (all),
      `dev-backend.sh`, `dev-frontend.sh`
- [x] `armstock-shared`
  - [x] TS package used by both apps
  - [x] Brand constants
- [x] `armstock-backend`
  - [x] Express on port 4200
  - [x] Check required env values at startup, stop with a clear message if one is missing
  - [x] Loggers copied from armlytic
  - [x] API logs: one row per request in the `api_logs` table, on/off with
        `API_DB_LOG_ENABLED` (no file logs)
  - [x] Connect to Postgres DB `armstock` (TypeORM, `synchronize: true`)
  - [x] Connect to Redis (keys start with `armstock:`)
  - [x] `GET /api/health` — says if the DB and Redis are OK
  - [x] `.env.example` with all variable names
- [x] `armstock-frontend`
  - [x] Vue 3 + Vite on port 4201
  - [x] Element Plus, Pinia, vue-router, vue-i18n (English)
  - [x] Brand CSS (colors, variables, fonts) copied from armlytic
  - [x] Logger and API service (axios) copied from armlytic
  - [x] Start page with the Armstock logo that shows the health check result
- [x] Lint and build pass
- [x] Checked in browser: app opens on 4201 with the logo and "DB OK / Redis OK"

## Step 2 — Login

- [x] Shared: `UserRole` enum — Platform Owner, Company Owner, Storekeeper, Accountant
- [x] `User` table
  - [x] email, password (hashed), role, active
  - [x] refresh token (hashed), last login
  - Company and staff links are added in their own steps (4 and 5)
- [x] Seeder creates the Platform Owner from env values (email, password) — `npm run seed -w armstock-backend`
- [x] API
  - [x] Login (with a per-IP rate limit)
  - [x] Refresh token
  - [x] Logout
  - [x] "Who am I"
  - [x] Turned-off user cannot log in
- [x] Middleware
  - [x] "Must be logged in" (Redis auth snapshot, falls back to DB)
  - [x] "Must have one of these roles"
- [x] `api_logs` rows get the user uuid
- [x] Frontend
  - [x] Login page (in its own layout)
  - [x] Tokens in cookies, auto refresh — same as armlytic
  - [x] `UserModel` (names null for now, `initials` / `displayName` fall back to the email)
  - [x] Main layout: sidebar menu by role, header with user avatar and logout
  - [x] Pages blocked by role (wrong role → back to own start page)
  - [x] Platform Owner start page: empty dashboard
- [x] Lint and build pass
- [x] Checked in browser: log in as Platform Owner, see the dashboard, log out

## Step 3 — Platform tools: Database + Logs

Copied from armlytic (`/owner/database`, `/owner/logs/database`). Platform Owner only.
Each is its own top-level menu item.

- [x] Database page
  - [x] API `GET /api/platform/database/storage`: database size, and per table — size,
        rows, index size
  - [x] Route `/database` (name `platform-database`), menu item "Database"
  - [x] Page: totals on top, tables list with search
- [x] Logs page
  - [x] API `GET /api/platform/logs`: `api_logs` rows with paging and filters
  - [x] API `DELETE /api/platform/logs`: clear all rows
  - [x] Route `/logs` (name `platform-logs`), menu item "Logs"
  - [x] Page: table with filters, row details for failed requests, "clear all" with
        confirm
  - [x] Viewing the logs does not add new log rows
  - [x] Confirm dialogs use SweetAlert2 (like armlytic)
- [x] `api_logs` rows get the user (company comes with Step 4)
- [x] Pages match armlytic: 5 stat cards with hints, expandable table rows, size bar +
      TOAST column; logs with User (email for now), Company, and Details columns
- [x] Platform Owner pages use compact padding (like armlytic)
- [x] Lint and build pass
- [x] Checked in browser: as Platform Owner open Database and Logs; Logs shows the
      requests just made

## Step 4 — Companies

- [x] To confirm: which company details → tax ID, phone, email, address (all optional),
      plus an empty `logo` column (no upload yet)
- [x] To confirm: turning off a company blocks its users from logging in → yes, also
      signs out users who are already logged in
- [x] `Company` table: name, tax ID, phone, email, address, logo, status
- [x] Users get a company link (empty for Platform Owner)
- [x] API (Platform Owner only)
  - [x] List with search and paging
  - [x] Create
  - [x] Edit
  - [x] Turn on/off
- [x] `api_logs` rows get the company; Logs page shows its name
- [x] Frontend: Companies page
  - [x] Table with search
  - [x] Add/edit dialog
  - [x] Active switch
- [x] Lint and build pass
- [x] Checked in browser: create, edit, find, and turn off companies (blocking users is
      checked in Step 5, once companies have users)
- [x] Rework: statuses instead of on/off
  - [x] Shared: `CompanyStatus` and `UserStatus` enums (Active, Blocked)
  - [x] `companies.status` and `users.status` replace `is_active`
  - [x] API: `PATCH /api/platform/companies/:uuid/status`
  - [x] Companies table: Status column and a "⋯" menu (Edit, Block / Activate)
  - [x] Lint and build pass
  - [x] Checked in browser: Status column, block (with confirm) and activate from the menu

## Step 5 — Users

- [x] To confirm: the creator sets the password by hand (no emails in MVP)? → yes
- [x] To confirm: staff records vs users → one `users` table for everyone; role `Staff`
      cannot log in (see decisions.md, "People")
- [x] Shared: `UserRole.STAFF`, `COMPANY_ROLES`, `COMPANY_LOGIN_ROLES`
- [x] `users` gets first name, last name, position; email and password can be empty
- [x] Login refuses users without a password; a STAFF token is rejected
- [x] One shared service, separate endpoints
  - [x] Platform Owner: `/api/platform/companies/:uuid/users` (list, add, edit, status)
  - [x] Company Owner: `/api/company/users` (list, add, edit, status)
- [x] Role rules: login role needs email + password (kept if it exists); Staff clears the
      password; nobody changes their own role or status
- [x] Company start page (empty dashboard) for Company Owner, Storekeeper, Accountant
- [x] Users page (Company Owner) and a company's users page (Platform Owner, from the
      company "⋯" menu): list with search and paging, Add/Edit dialog, Block/Activate
- [x] Company Owner — edit own company details
- [x] Lint and build pass
- [x] Checked in browser: as Platform Owner add a Company Owner to a company; as that
      owner add a Chef (Staff) and a Storekeeper, then log in as that Storekeeper
- [x] Checked in browser: change the Storekeeper to Staff → they cannot log in; back to
      Storekeeper with a new password → they can
- [x] Checked in browser: as Platform Owner block that company → the Storekeeper is
      logged out and cannot log in; activate it → they can log in again

## Step 6 — Units

- [x] `MeasureUnit` table (`measure_units`): company, name ("Կիլոգրամ"), short name ("կգ"), allows decimals. Name
      and short name are unique inside the company (ignoring case).
- [x] New company gets the default units (`DefaultMeasureUnits.ts`)
- [x] Shared: `CATALOG_MANAGER_ROLES` (Company Owner, Storekeeper)
- [x] API (`/api/measure-units`, own company only)
  - [x] All company roles can read
  - [x] Company Owner and Storekeeper add, edit, delete
  - [x] Delete — always allowed for now; the "no product uses it" check comes in Step 8
- [x] Frontend: Units page (menu "Units") for company roles
  - [x] Table with search
  - [x] Add/edit dialog and delete with confirm — Company Owner and Storekeeper only
  - [x] Accountant sees the list without actions
- [x] Lint and build pass
- [x] Checked in browser: as Company Owner add, edit, and delete a unit; a new company
      starts with the 4 default units; as Accountant the list has no actions

## Step 7 — Product categories

- [x] `ProductCategory` table (`product_categories`): company, name (unique inside the
      company, ignoring case)
- [x] New company gets the default categories (`DefaultProductCategories.ts`)
- [x] API (`/api/product-categories`, own company only)
  - [x] All company roles can read
  - [x] Company Owner and Storekeeper add, edit, delete
  - [x] Delete — always allowed for now; the "no product uses it" check comes in Step 8
- [x] Frontend: Product categories page (menu "Product categories")
  - [x] Table with search
  - [x] Add/edit dialog and delete with confirm — Company Owner and Storekeeper only
  - [x] Accountant sees the list without actions
- [x] Lint and build pass
- [x] Checked in browser: add, edit, and delete categories; a new company starts with
      the default categories; as Accountant the list has no actions

## Step 8 — Products

- [x] To confirm: block changing the unit once the product has stock? → the unit can never
      be changed after create; a different packing is a different product
- [x] To confirm: active yes/no → `ProductStatus` (Active, Archived)
- [x] `Product` table: company, name, measure unit, category, code (optional, unique inside
      the company, ignoring case), status. No price field.
- [x] Unit delete blocked if a product uses the unit (moved from Step 6)
- [x] Product category delete blocked if a product uses it (moved from Step 7)
- [x] API (`/api/products`, own company only)
  - [x] Company Owner and Storekeeper add, edit, archive/restore
  - [x] Accountant only sees
  - [x] List: search by name or code, filter by category and status, paging
- [x] Frontend: Products page (menu "Products")
  - [x] Table with filters (starts on Active)
  - [x] Add/edit dialog — unit locked on edit
  - [x] Archive / Restore in the "⋯" menu
- [x] Lint and build pass
- [x] Checked in browser: add products with units and categories, find them with filters,
      archive one; deleting a used unit or category shows an error

## Step 9 — Suppliers

- [x] To confirm
  - [x] Keep tax ID (ՀՎՀՀ), optional
  - [x] Status instead of active yes/no: `SupplierStatus` Active (10), Archived (20);
        list starts on Active
  - [x] Delete allowed only if no stock-in document uses the supplier, otherwise archive
  - [x] Several contacts per supplier (`supplier_contacts`); phone moves to contacts,
        no email
  - [x] Name unique inside the company (ignoring case, archived included)
  - [x] Accountant manages suppliers too
- [x] `Supplier` table (`suppliers`): company, name, tax ID, note, status. Only name is
      required.
- [x] `SupplierContact` table (`supplier_contacts`): supplier, name (required), position,
      phone, note
- [x] API (`/api/suppliers`, own company only)
  - [x] Company Owner, Accountant, and Storekeeper manage (add, edit, archive/restore,
        delete)
  - [x] Contacts: own endpoints (`/api/suppliers/:uuid/contacts`) to add, edit, delete
  - [x] Delete removes the contacts too; always allowed for now, the "no stock-in uses
        it" check comes in Step 10
  - [x] List: search by name, filter by status, paging
- [x] Frontend: Suppliers page (menu "Suppliers")
  - [x] Table with filters (starts on Active): firm name, tax ID, firm note, status
  - [x] Expandable rows: contacts (add/edit popup, delete)
  - [x] Add/edit dialog: "Firm name", tax ID, "Firm note"; after create the "Add contact"
        popup opens
  - [x] Archive / Restore and Delete (with confirm) in the "⋯" menu
- [x] Lint and build pass
- [x] Checked in browser: add, edit, find, archive, and delete suppliers

## Step 10 — Stock-in documents

- [x] To confirm: how stock is counted — summed from documents each time, or kept in a
      stock table updated on every save → summed in SQL each time, no stock table
- [x] Shared: `StockInReason` enum — Purchase, Initial stock, Other
- [x] Tables
  - [x] `StockIn` (`stock_ins`, header): company, number, reason, date (timestamp with
        time, defaults to now, user can change), supplier (Purchase only), supplier's
        invoice number (optional text, Purchase only), note, created by
  - [x] Number shown as `IN-2026-0015`: counter per company, restarts each year (year of
        creation). Next = biggest this year + 1; unique in the DB per company + year, so on
        a clash the save retries with the next number.
  - [x] `StockInLine` (`stock_in_lines`): document (deleted with it), company (copied from
        the document so stock queries skip the join), product, quantity numeric(14,3),
        price per unit numeric(14,2), total numeric(14,2). The user types price or total,
        the other fills in.
- [x] Rules
  - [x] Purchase → supplier required; Other → note required
  - [x] Date can't be in the future (past dates are fine)
  - [x] At least one line; quantity above 0; price 0 or more
  - [x] The same product may appear on several lines (like 1C)
  - [x] Decimals only if the product's unit allows them
  - [x] Header and lines saved together (all or nothing)
  - [x] Only the creator can edit or delete
  - [x] Edit or delete blocked if any product's stock would go below zero
  - [x] Archived products and suppliers can't be picked (new or edit); rows that already
        have them stay and can be changed or deleted
- [x] Supplier delete blocked if a stock-in document uses it (moved from Step 9)
- [x] API
  - [x] Company Owner and Storekeeper create
  - [x] Accountant only sees
- [x] Frontend (menu "Stock" → "In"; two-level menu: Stock → In / Out / Balance)
  - [x] List page: date, reason, supplier, total, created by; filters by date, reason,
        supplier
  - [x] Form page: header fields change by reason; lines table (add/remove rows; new row
        goes at the bottom like 1C, cursor jumps to its product field); pinned bottom bar
        with row count, document total, Cancel and Save — only the rows scroll
  - [x] Unsaved changes warning, only when something changed: our own dialog (Stay /
        Leave) for in-app navigation and Cancel; the browser's own alert for reload or
        closing the tab
  - [x] View page: header and lines
- [x] Lint and build pass
- [x] Checked in browser: add a purchase with several products, open it, edit it,
      delete it

## Step 11 — Stock view

- [x] API
  - [x] Per product: quantity, unit, average price, value (quantity × average price)
  - [x] Total value of all stock
  - [x] Calculated in SQL
  - [x] All company roles can see it
- [x] Frontend: Stock balance page (menu "Stock" → "Balance")
  - [x] Average price marked with "~" before the number (e.g. ~360.00), column header
        "Avg price", tooltip "Average of all stock-in prices"; value and total value get
        "~" too
  - [x] Total value on top as compact stat cards, like Stock → In (`StatCard compact`):
        total value ~, products in stock
  - [x] Table with search and category filter
  - [x] "Only in stock" switch, on by default; off also shows products at 0
  - [x] Archived products: shown with an "Archived" tag while they still have stock (they
        count in the total value); never shown at 0, even with the switch off
- [x] Lint and build pass
- [x] Checked in browser: stock page shows what was added in step 10, with values

## Step 12 — Archived users

- [x] Shared: `UserStatus.ARCHIVED = 30` — the person left the company (Blocked = still
      works here, login stopped for now)
- [x] Archived users cannot log in, same as blocked
- [x] Archive / restore from the users list (Company Owner's Users page and the Platform
      Owner's company users page — one shared service); "Archived" tag. Menu: Active →
      Edit · Block · Archive; Blocked → Edit · Activate · Archive; Archived → Edit · Restore
      (Restore sets Active)
- [x] Users list shows everyone sorted Active → Blocked → Archived; filters like suppliers
      (search + single-select status, starts empty)
- [x] Lint and build pass
- [x] Checked in browser: archive a Staff user, it leaves the default list, restore it;
      archive a logged-in user — they are logged out on their next action and cannot
      log in again

## Step 13 — Stock-out documents

- [x] Shared enums
  - [x] `StockOutReason` — Returned, Issued, Damaged, Expired, Other
  - [x] `StockOutDepartment` — Kitchen (more values later)
- [x] Tables
  - [x] `StockOut` (header): company, number (`OUT-2026-0015`, same rule as stock-in),
        reason, date, supplier, department, receiver (user), note, created by
  - [x] `StockOutLine`: document, product, quantity. No price.
- [x] Rules
  - [x] Returned → supplier required (active suppliers only)
  - [x] Issued → department required (form fills in Kitchen); receiver optional
  - [x] Damaged / Expired → no supplier, department, or receiver
  - [x] Other → note required; note optional for every other reason
  - [x] Receiver picker: active users first, then blocked and archived ones with their
        tag (goods may be entered days later, after the person left)
  - [x] Same line rules as stock-in (quantity above 0, decimals by unit)
  - [x] Blocked if not enough stock — the error names each product with its available
        quantity and unit ("Not enough stock: Meat — available 2 kg"); stock-in edit and
        delete show the same message
  - [x] Lock the products on the document at the start of every stock save (stock-out
        create/edit/delete, stock-in edit/delete), sorted by uuid, so two saves at the
        same time can't push stock below zero
  - [x] `AppError`: optional client-safe data, separate from `details` (which stays
        logs-only)
  - [x] Returned: no more than that supplier brought minus what was already returned to
        it; a product it never brought can't be returned. Error popup lists each product
        with what can still be returned
  - [x] Returned: the product picker shows only products that supplier brought ("Choose
        the supplier first" when none is picked)
  - [x] Stock-in edit/delete: what the old supplier brought can't drop below what was
        returned to it (edit down, delete, supplier change, Purchase → other reason)
  - [x] Archived products can be picked while they still have stock ("Archived" tag in
        the picker); stock-in still blocks them
  - [x] Only the creator can edit or delete
- [x] API
  - [x] Company Owner and Storekeeper create
  - [x] Accountant only sees
- [x] Frontend (menu "Stock" → "Out"): list, form, and view pages — same layout as stock-in
- [x] Lint and build pass
- [x] Checked in browser: issue goods to the Kitchen with the Chef (Staff) as receiver,
      write off spoiled goods, return goods to a supplier, stock goes down; issuing too
      much shows an error

## Step 14 — User permissions

Company roles become editable templates, and every user has their own permission list.
Full rules: "Permissions (from Step 14)" in [decisions.md](decisions.md).

Suggested chunks (each: notes → OK → build → lint/build):

1. Shared enums and `can()`, `roles` table, user columns, database recreated, dev seeder
2. Backend: `PermissionMiddleware` on every company route, auth cache, roles API, user
   create/edit rules, picker endpoints, product delete
3. Frontend base: `UserModel` with a `Set`, `can()`, route `meta.permission`, menu and
   buttons, pickers on the new endpoints, lost-access popup
4. Frontend screens: user dialog with the permission panel, roles page, users list,
   product delete
5. Dashboard cards
6. Browser check

- [x] **Confirmed:** the permission list and the starting permissions of Storekeeper,
      Accountant, and HR - table in decisions.md
- [x] **Confirmed:** the company dashboard cards - table in decisions.md
- [x] **Confirmed:** no move-over of old users - the local database is dropped and
      recreated, and the dev seeder below fills it again
- [x] Shared
  - [x] `Permission` enum - the 33 permissions from the table in decisions.md
  - [x] Permission groups for the panel (`PermissionGroup` enum + `PERMISSION_GROUPS`):
        Company, Users, Units, Categories, Products, Suppliers, Supplier contacts, Stock
  - [x] `AccountType` enum: `PLATFORM_OWNER`, `COMPANY_OWNER`, `COMPANY_MEMBER` (replaces
        `UserRole`)
  - [x] `DefaultRole` enum + `DEFAULT_ROLE_PERMISSIONS` map: Storekeeper, Accountant, HR, Staff (empty)
  - [x] One `can(accountType, permissions, permission)` helper used by backend and
        frontend; it takes a `ReadonlySet<Permission>` - the API sends an array, the
        frontend `UserModel` and the backend auth snapshot turn it into a `Set` once
- [x] DB
  - [x] `roles` table: company, name, `permissions int[]`
  - [x] `users`: `account_type`, `role_uuid` (members only), `permissions int[]`,
        "can log in"
  - [x] New company: the four default roles seeded from the map
  - [x] New company: one Owner account - the "New company" dialog takes the Owner's first
        name, last name, email, and password; company and Owner saved in one transaction.
        Every user added later is a `COMPANY_MEMBER`
  - [x] Old `role` column and `UserRole` enum removed (database recreated, no migration) -
        at the end of chunk 3, once nothing uses them; until then they live side by side
- [x] Dev seeder (`npm run seed:dev -w armstock-backend`) - replaces the old "Role check
      pass" seeder
  - [x] Creates a demo company: the Owner, a Storekeeper, an Accountant, an HR user, and
        a Staff user without login, with the default roles and their permissions, plus the seed
        data; when the demo company already exists it stops - drop the database to reseed
  - [x] Emails and the shared password from `.env` (`DEV_SEED_*`), placeholders in
        `.env.example`; stops with a clear message when one is missing
  - [x] Refuses to run unless `NODE_ENV` is `development`
  - [x] Local `.env` filled with the current local emails and the dev password - only
        after asking the user
- [x] Rules
  - [x] Exactly one Company Owner; only the Platform Owner can touch that account
  - [x] Role permissions copied to the user on create and on role change
  - [x] Role edit asks whether to also apply to that role's users (replacing their own
        changes)
  - [x] User permissions split: `USER_ADD` (create + pick role), `USER_EDIT` (name,
        position, login, email, password, block, archive - never role or permissions),
        `MANAGE_USER_PERMISSIONS` (everything about rights: roles, role permissions,
        others' permissions, changing an existing user's role)
  - [x] Anything that touches roles or permissions = Company Owner ||
        `MANAGE_USER_PERMISSIONS` (Platform Owner: later)
  - [x] Default role templates stay compact - only the basics for each job
  - [x] Nobody can change their own permissions or role
  - [x] Product delete (new): only while the product is in no stock-in or stock-out line;
        otherwise "archive it instead"
  - [x] Every delete checks the permission first, then the "not in use" rule
  - [x] A role in use can't be deleted - the error says how many users have it (active,
        blocked, and archived count)
  - [x] "Can log in" per user: no = no email, no password, no permissions; still a
        stock-out receiver
- [x] Users - create and edit (backend and frontend)
  - [x] Schemas and service: `role_uuid` (company role), "can log in", `permissions`;
        account type set by the server, never from the request
  - [x] Can log in = yes: email and password required (password only on create or when
        turning login on); no: email and password cleared, permissions emptied
  - [x] Role picker lists the company's roles; picking one fills the permission panel with
        its set (create) - on edit only with `MANAGE_USER_PERMISSIONS`
  - [x] Each part of the dialog follows its permission: basic data `USER_EDIT`, role and
        permissions `MANAGE_USER_PERMISSIONS`; your own account and the Owner account
        are read-only where the rules say so
  - [x] Users list: role name column, "No login" tag, role filter next to the status filter
  - [x] Platform Owner's company users page keeps working through the shared service -
        only adjusted to the new structure, no new features: add = company role (through
        `/options/roles`-style list) + "can log in", permissions copied from the role; edit =
        basic data only (role and permissions: later); the Owner row shows an "Owner" tag and
        is editable only here
- [x] Picker endpoints - open to every logged-in company member (no permission), minimal
      data only, never prices, stock amounts, or emails
  - [x] `GET /options/products` → `IStockLineProduct` (uuid, name, code, status, unit,
        allows decimals); search, `forStockOut`, `suppliedBy` (both move here from
        `GET /products`)
  - [x] `GET /options/suppliers` → uuid, name, status; search, active only or all
  - [x] `GET /options/receivers` → uuid, name, position, status (moves from
        `/stock-outs/receivers`)
  - [x] `GET /options/roles` → uuid, name
  - [x] Every picker and picker-style filter in the frontend uses these (product and
        supplier pickers, supplier filters, receiver picker, role picker and filter)
- [x] Backend
  - [x] Roles API: list, create, edit (with "apply to users"), delete - Owner or
        `MANAGE_USER_PERMISSIONS`
  - [x] `PermissionMiddleware(Permission.X)` replaces the role lists on company routes
  - [x] Permissions in the auth cache; a change applies on the user's next request
- [x] Frontend
  - [x] Products: Delete action (with `PRODUCT_DELETE`), refused while in use
  - [x] Company dashboard: the cards from decisions.md, each shown by its permission and
        loading on its own; empty state when no card applies; open to every member who can
        log in
  - [x] Permission panel: groups with a group switch, every permission its own switch
  - [x] Roles page (Owner or `MANAGE_USER_PERMISSIONS`): list, add, edit permissions,
        delete
  - [x] User dialog: role picker (on create with `USER_ADD`; on edit only with
        `MANAGE_USER_PERMISSIONS`), "Can log in", permission panel grouped by area with
        switches and "Reset to role defaults"; hidden without `MANAGE_USER_PERMISSIONS`
        (the role decides) and without login; read-only on your own account. Saved through
        `PUT /company/users/:uuid/access` (role + permissions together)
  - [x] `can(Permission.X)` replaces the `canManage…` flags in menu and buttons; routes use
        `meta.permission`
  - [x] Lost access - a request refused with 403 (e.g. Save), or a reload of a page that is
        no longer allowed: reload the user, and if the page is no longer allowed show one
        generic popup ("Your permissions have changed. You no longer have access to this
        page.") with OK. OK reloads the app at `/` (the user's dashboard). Same popup for
        both cases; the unsaved-changes dialog is skipped and typed data is lost (accepted)
- [x] Lint and build pass
- [ ] Checked in browser - moved to after Step 15 (one browser pass for the full flow)
  - [ ] Two Accountants: turn off supplier management for one - menu and buttons
        disappear and the API refuses; the other still has it
  - [ ] Edit a role and apply to its users - their lists change; edit again without
        applying - they stay
  - [ ] Delete a role that 3 users have - refused with "3 users have this role"; move
        them, then it deletes
  - [ ] An HR intern with only `USER_ADD` creates a user with a role but can't open
        existing users; an HR user with `USER_EDIT` changes a password but the role picker
        is read-only and the permission panel is hidden; with `MANAGE_USER_PERMISSIONS` both open (but
        not on your own account); the Owner account has no edit actions
  - [ ] A user without login has no email, password, or permissions, and can still be a
        stock-out receiver
  - [ ] Dashboard as Storekeeper, Accountant, HR, and a user with no permissions - each
        sees only their cards (or the empty state); turning a permission off removes its
        card after the next load
  - [ ] A Storekeeper on the new stock-in form loses "create stock-in" - Save shows the
        popup and OK opens the dashboard; reloading that form page shows the same popup

## Step 15 — Backend tester

A reusable end-to-end tester like armlytic's (`armlytic-backend/src/scripts/tester/`): it
calls the real HTTP API with real logins and checks the responses and the database. No test
framework, no new package — runs with `ts-node`. Where armlytic already made a choice,
reuse it with the same logic; only armstock-specific points are decided here.

- [ ] Sides like armlytic: company side, platform side, rate-limits side; `npm test` runs
      all, `test:company` / `test:platform` / `test:rate-limits` run one. Each side builds
      its own scratch database and backend; a side that fails to set up doesn't stop the
      others
- [x] Rate limits like armlytic: each side has its own Redis index, so limit counters
      start at zero; normal suites stay under the limits; the rate-limits side hits them
      on purpose

- [x] Copy the core from armlytic: runner, HTTP client, asserts, DB setup, server start.
      Leave out the report files (JSON + HTML) and armlytic-only parts (Polar, Telegram,
      surveys) - results print in the terminal only: pass/fail per case, failures with
      the reason, a total at the end
- [x] Each run: own scratch database built with `synchronize` (MVP), own backend on a free
      port, own Redis index — the dev database and dev server stay untouched; the scratch
      database is dropped at the end
- [x] Test logins made per run with random passwords (like armlytic), never printed; they
      live only in the scratch database. No new env vars - the tester reads only the
      backend's own `DB_*`, `REDIS_*`, `JWT_*`
- [x] `npm test -w armstock-backend`; exit code 0 only when everything passed
- [x] README in the tester folder as the coverage map: what is tested, what is still open

### Shared parts (built once, reused by every suite)

A new suite only adds cases and, if needed, new helpers next to the old ones. It never
changes how an existing helper works - if a helper must change, that is its own small task.

- [x] Fixture: two companies (to check one can't reach the other), each with Owner,
      Storekeeper, Accountant, HR and a user with no permissions; logged in, tokens ready
- [x] User builder: make a user with exactly the permissions a case needs (for the
      permission checks)
- [x] Data builders: unit, category, product, supplier (+ contact), stock-in, stock-out -
      each one call with sensible defaults, any field can be overridden
- [x] Stock check helper: read a product's stock from the database and compare it with what
      the documents add up to
- [x] Route list: every company route with its method, path and required permission - one
      table that the permission and company-isolation suites both loop over; a check fails
      the run when the table and the app's routers differ
- [x] Common checks: bad body → 422 with field errors; unknown uuid → 404; no token → 401;
      error message never shows internal details

### Suites, most important first

Every suite also checks, for its own routes: the happy path, bad input (Zod), unknown
uuid, and another company's uuid.

1. - [x] **Stock-out** - rules per reason; "Not enough stock" with the available quantity;
       creator-only edit/delete; Accountant only sees; list, get, summary
2. - [x] **Stock-in** - create, edit, delete; edit/delete that would make stock negative is
       refused with the same stock error; list, get, summary
3. - [x] **Two saves at the same time** on the same product (in and out mixed): only one goes
       through, stock stays right
       - [x] Bug found and fixed: 6-8 documents saved at once got a 500 (document number
             clash after 3 retries). Now a per-company lock in `utils/documentNumber.ts`
4. - [x] **Returns to a supplier** (examples in decisions.md) - within what it brought; more
       than it brought; a product it never brought; two returns that together go over;
       editing a return doesn't count itself
5. - [x] **Stock-in after returns** - edit down above and below the returned amount, delete,
       change supplier, change Purchase → Other
6. - [x] **Stock balance** - `/stock/balance` and its summary match the documents; filters
       and paging
7. - [x] **Company isolation** - every company route, called with the other company's
       uuids, gives 404 and changes nothing
8. - [x] **Permissions** - every company route refuses a user without its permission and
       allows one with it
9. - [x] **Auth and sessions** - login, refresh, logout, current user; wrong password;
       turned-off user and turned-off company are locked out; login rate limit
       - [ ] **Open security issue - session revocation** (found by the tester, fix postponed).
             Logout, a new password and login turned off should end every old session for
             good. Today the "tokens before now are dead" mark (`revokedBefore`) lives only in
             the Redis snapshot: a new login or refresh overwrites it, and a cache expiry or
             Redis restart loses it - an old access token then works again until it expires
             (up to `JWT_EXPIRES_IN`, 15 min). Refresh tokens are fine (cleared in the DB).
             Also: a new password ends no session at all today. Blocking is not affected
             (status is in the DB). Danger: low-medium - needs an already stolen token.
             - Agreed direction: store the revoke time in the DB (`users.sessions_revoked_at`),
               the snapshot reads it from the user row, login never clears it; compare in whole
               seconds (JWT `iat` has seconds only). Same design and same gap in armlytic -
               checked there separately (`armlytic/documents/planning/session-revocation/`)
             - To decide at fix time: changing **your own** password must not log you out -
               recommended: end all sessions, then return a fresh token pair to the caller
               (small frontend change); a password set by someone else logs the user out
             - 4 tester cases wait for it, marked `[open: session revocation]` (skipped)
             - Side note: two logins of one user in the same second get the same refresh
               token (no unique id in the JWT) - harmless, keep in mind when testing
10. - [x] **Company users** - list, summary, create (with and without login), edit, access,
        status; can't change own permissions or role; Owner account can't be touched from
        the company side; `USER_ADD` / `USER_EDIT` / `MANAGE_USER_PERMISSIONS` limits
        - [x] Rule added: a new password for a user with MANAGE_USER_PERMISSIONS only from
              the Owner, the Platform Owner or a permissions manager (`USER_PASSWORD_LOCKED`) -
              otherwise `USER_EDIT` could log in as someone with more rights
11. - [x] **Roles** - create, edit, apply to users, delete; delete refused while users have
        the role
12. - [x] **Products** - list, create, edit, status, delete; delete rules once the product is
        used in documents
13. - [x] **Suppliers and contacts** - list, create, edit, status, delete; add, edit, delete
        contact; delete rules once used in documents
14. - [x] **Product categories** - list, create, edit, delete; delete rules while in use
15. - [x] **Measure units** - list, create, edit, delete; delete rules while in use
        - [x] Rule added: "allows decimals" can't be turned off while any product uses the
              unit (`MEASURE_UNIT_DECIMALS_IN_USE`) - fractional stock would get stuck
16. - [x] **Options** - products, suppliers, receivers, roles: only active, only own company
17. - [x] **Company profile** - get and edit; who may do it
18. - [ ] **Platform: companies and their users** - list, create, edit, status, get, roles;
        users list, create, edit, status; company users can't call any platform route
        - [ ] Open bug: an unknown company's roles and users answer 200 with an empty list
              (create user: "role not found") instead of `COMPANY_NOT_FOUND`. Fix to be discussed
19. - [x] **Platform: database and logs** - storage info; logs list and clear
        - [x] Bug found and fixed: the logs `dateFrom` / `dateTo` filter was off by the DB time
              zone (`Asia/Yerevan`, 4 h) - ISO text compared with a local `timestamp` column.
              Now converted with `new Date(...)` like the stock filters
        - Prod check: the server's Node and Postgres must use the same time zone (`date`,
          `SHOW timezone;`) - display and every date filter rely on it
20. - [x] **Health** - answers without a token

- [ ] Lint and build pass
- [ ] Tester run passes

---

## Later (after MVP)

Ideas agreed for later. Not part of any step above.

- [ ] Redis cache for the units and categories lists (one copy per company, cleared on
      add, edit, delete; DB read when Redis is down). Add when there is real load and the
      API logs show slow reads. Products and stock amounts are not cached.
- [ ] Platform Owner manages a company's roles and user permissions (same rules as
      `MANAGE_USER_PERMISSIONS`).
- [ ] Transfer company ownership - Platform Owner action only: move the Owner account type to
      another user and give the old Owner a normal role in the same step.
- [ ] Delete a company. To decide: delete only a company with no users yet, or also
      everything it owns (users, products, stock documents).
- [ ] Armenian language: add an Armenian locale file (e.g. menu Պահեստ → Մուտք / Ելք /
      Մնացորդ for Stock → In / Out / Balance), and maybe make Armenian the default language.
- [ ] Per-company setting "Allow negative stock" (like 1C), for places that take goods out
      before the stock-in is entered. Needs a "negative stock" warning list, and a rule for
      the value of negative quantities. Blocking stays the default.
