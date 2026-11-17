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
- [ ] Step 8 — Products
- [ ] Step 9 — Suppliers
- [ ] Step 10 — Stock-in documents
- [ ] Step 11 — Stock view
- [ ] Step 12 — Stock-out documents
- [ ] Step 13 — Redis cache
- [ ] Step 14 — Role check pass

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
- [x] New company gets the default units: Հատ (հատ), Կիլոգրամ (կգ), Լիտր (լ), Մետր (մ)
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
- [x] New company gets the default categories: Բանջարեղեն, Միրգ, Միս, Ձուկ, Կաթնամթերք,
      Հացամթերք, Չոր մթերք, Ըմպելիք, Համեմունք, Տնտեսական ապրանք, Այլ
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

- [ ] To confirm: block changing the unit once the product has stock?
- [ ] `Product` table: company, name, unit, category, code (optional, unique inside the
      company), active. No price field.
- [ ] Unit delete blocked if a product uses the unit (moved from Step 6)
- [ ] Product category delete blocked if a product uses it (moved from Step 7)
- [ ] API
  - [ ] Company Owner and Storekeeper manage
  - [ ] Accountant only sees
  - [ ] List: search by name or code, filter by category and active, paging
- [ ] Frontend: Products page
  - [ ] Table with filters
  - [ ] Add/edit dialog
- [ ] Lint and build pass
- [ ] Checked in browser: add products with units and categories, find them with filters

## Step 9 — Suppliers

- [ ] `Supplier` table: company, name, contact person, phone, email, tax ID, note,
      active. Only name is required.
- [ ] API
  - [ ] Company Owner, Accountant, and Storekeeper manage
  - [ ] List: search by name, filter by active, paging
- [ ] Frontend: Suppliers page
  - [ ] Table with filters
  - [ ] Add/edit dialog
- [ ] Lint and build pass
- [ ] Checked in browser: add, edit, find, and turn off suppliers

## Step 10 — Stock-in documents

- [ ] To confirm: how stock is counted — summed from documents each time, or kept in a
      stock table updated on every save
- [ ] Shared: `StockInReason` enum — Purchase, Initial stock, Other
- [ ] Tables
  - [ ] `StockIn` (header): company, reason, date, supplier, note, created by
  - [ ] `StockInLine`: document, product, quantity, price per unit
- [ ] Rules
  - [ ] Purchase → supplier required; Other → note required
  - [ ] At least one line; quantity above 0; price 0 or more
  - [ ] Decimals only if the product's unit allows them
  - [ ] Header and lines saved together (all or nothing)
  - [ ] Only the creator can edit or delete
  - [ ] Edit or delete blocked if any product's stock would go below zero
- [ ] API
  - [ ] Company Owner and Storekeeper create
  - [ ] Accountant only sees
- [ ] Frontend
  - [ ] List page: date, reason, supplier, total, created by; filters by date, reason,
        supplier
  - [ ] Form page: header fields change by reason; lines table (add/remove rows)
  - [ ] View page: header and lines
- [ ] Lint and build pass
- [ ] Checked in browser: add a purchase with several products, open it, edit it,
      delete it

## Step 11 — Stock view

- [ ] API
  - [ ] Per product: quantity, unit, last stock-in price, value (quantity × price)
  - [ ] Total value of all stock
  - [ ] Calculated in SQL
  - [ ] All company roles can see it
- [ ] Frontend: Stock page
  - [ ] Total value on top
  - [ ] Table with search and category filter
  - [ ] "Only in stock" switch
- [ ] Lint and build pass
- [ ] Checked in browser: stock page shows what was added in step 10, with values

## Step 12 — Stock-out documents

- [ ] Shared: `StockOutReason` enum — Issued, Spoiled, Other
- [ ] Tables
  - [ ] `StockOut` (header): company, reason, date, receiver (user), note, created by
  - [ ] `StockOutLine`: document, product, quantity. No price.
- [ ] Rules
  - [ ] Issued → receiver (a company user) required; Other → note required
  - [ ] Same line rules as stock-in (quantity above 0, decimals by unit)
  - [ ] Blocked if not enough stock — the error names the product
  - [ ] Only the creator can edit or delete
- [ ] API
  - [ ] Company Owner and Storekeeper create
  - [ ] Accountant only sees
- [ ] Frontend: list, form, and view pages — same layout as stock-in
- [ ] Lint and build pass
- [ ] Checked in browser: issue goods to the Chef (Staff), write off spoiled goods, stock goes
      down; issuing too much shows an error

## Step 13 — Redis cache

- [ ] Shared Redis helper copied from armlytic
- [ ] Cache units
- [ ] Cache categories (per company)
- [ ] Cache products (per company)
- [ ] Clear the cache when an item is added, edited, or deleted
- [ ] If Redis is down, read from the DB and log the problem
- [ ] Stock quantities are never cached
- [ ] Lint and build pass
- [ ] Checked in browser: lists work the same, logs show cache hits, changes show up
      at once

## Step 14 — Role check pass

- [ ] Seeder adds a demo company with one user per role (emails and passwords from env)
- [ ] Check every page and API for each role
  - [ ] Platform Owner
  - [ ] Company Owner
  - [ ] Storekeeper
  - [ ] Accountant
- [ ] Fix anything that does not match the roles table in [decisions.md](decisions.md)
- [ ] Lint and build pass
- [ ] Checked in browser: each role sees only its own menus and actions

---

## Later (after MVP)

Ideas agreed for later. Not part of any step above.

- [ ] Delete a company. To decide: delete only a company with no users yet, or also
      everything it owns (users, products, stock documents).
