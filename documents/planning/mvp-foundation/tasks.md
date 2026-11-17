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

- [ ] Step 1 — Skeleton
- [ ] Step 2 — Login
- [ ] Step 3 — Companies
- [ ] Step 4 — Staff + users
- [ ] Step 5 — Units
- [ ] Step 6 — Categories
- [ ] Step 7 — Products
- [ ] Step 8 — Suppliers
- [ ] Step 9 — Stock-in documents
- [ ] Step 10 — Stock view
- [ ] Step 11 — Stock-out documents
- [ ] Step 12 — Redis cache
- [ ] Step 13 — Role check pass

---

## Step 1 — Skeleton

- [ ] List new packages and get approval before install
- [ ] Root `package.json`
  - [ ] npm workspaces: `armstock-assets`, `-shared`, `-backend`, `-frontend`
  - [ ] `dev` script that starts everything together
- [ ] `armstock-shared`
  - [ ] TS package used by both apps
  - [ ] Brand constants
- [ ] `armstock-backend`
  - [ ] Express on port 4200
  - [ ] Check required env values at startup, stop with a clear message if one is missing
  - [ ] Loggers copied from armlytic
  - [ ] Connect to Postgres DB `armstock` (TypeORM, `synchronize: true`)
  - [ ] Connect to Redis (keys start with `armstock:`)
  - [ ] `GET /api/health` — says if the DB and Redis are OK
  - [ ] `.env.example` with all variable names
- [ ] `armstock-frontend`
  - [ ] Vue 3 + Vite on port 4201
  - [ ] Element Plus, Pinia, vue-router, vue-i18n (English)
  - [ ] Brand CSS (colors, variables, fonts) copied from armlytic
  - [ ] Logger and API service (axios) copied from armlytic
  - [ ] Start page with the Armstock logo that shows the health check result
- [ ] Lint and build pass
- [ ] Checked in browser: app opens on 4201 with the logo and "DB OK / Redis OK"

## Step 2 — Login

- [ ] Shared: `UserRole` enum — Platform Owner, Company Owner, Storekeeper, Accountant
- [ ] `User` table
  - [ ] email, password (hashed), role, active
  - [ ] company (empty for Platform Owner)
  - [ ] staff link (optional, filled in step 4)
  - [ ] refresh token (hashed)
- [ ] Seeder creates the Platform Owner from env values (email, password)
- [ ] API
  - [ ] Login
  - [ ] Refresh token
  - [ ] Logout
  - [ ] "Who am I"
  - [ ] Turned-off user cannot log in
- [ ] Middleware
  - [ ] "Must be logged in"
  - [ ] "Must have one of these roles"
- [ ] Frontend
  - [ ] Login page
  - [ ] Tokens in cookies, auto refresh — same as armlytic
  - [ ] Main layout: sidebar menu by role, header with user name and logout
  - [ ] Pages blocked by role (wrong role → back to own start page)
  - [ ] Platform Owner start page: empty dashboard
- [ ] Lint and build pass
- [ ] Checked in browser: log in as Platform Owner, see the dashboard, log out

## Step 3 — Companies

- [ ] To confirm: which company details (phone, address, tax ID?)
- [ ] To confirm: does turning off a company block its users from logging in?
- [ ] `Company` table: name, active, chosen details
- [ ] API (Platform Owner only)
  - [ ] List with search and paging
  - [ ] Create
  - [ ] Edit
  - [ ] Turn on/off
- [ ] Frontend: Companies page
  - [ ] Table with search
  - [ ] Add/edit dialog
  - [ ] Active switch
- [ ] Lint and build pass
- [ ] Checked in browser: create, edit, find, and turn off companies

## Step 4 — Staff + users

- [ ] To confirm: the creator sets the password by hand (no emails in MVP)?
- [ ] To confirm: does turning off a staff member also turn off their login?
- [ ] `CompanyStaff` table: company, full name, position, active
- [ ] Link a user to one staff record
- [ ] Platform Owner: on a company, add its Company Owner (staff + login together)
- [ ] Company Owner — Staff page
  - [ ] List
  - [ ] Add / edit
  - [ ] Turn on/off
- [ ] Company Owner — logins
  - [ ] "Give login" on a staff member: email, password, role
  - [ ] Change role
  - [ ] Turn login off
- [ ] Company Owner — edit own company details
- [ ] Lint and build pass
- [ ] Checked in browser: as Company Owner add a Chef (no login) and a Storekeeper
      (with login), then log in as that Storekeeper

## Step 5 — Units

- [ ] `Unit` table: name ("Kilogram"), short name ("kg"), allows decimals
- [ ] Seeder adds: piece, kg, liter, meter
- [ ] API
  - [ ] Everyone logged in can read the list
  - [ ] Only Platform Owner can add or edit
  - [ ] Delete only if no product uses the unit
- [ ] Frontend: Units page for Platform Owner
  - [ ] Table
  - [ ] Add/edit dialog
- [ ] Lint and build pass
- [ ] Checked in browser: see the units list, add a unit, edit one

## Step 6 — Categories

- [ ] `Category` table: company, name (unique inside the company)
- [ ] API
  - [ ] Company Owner and Storekeeper manage
  - [ ] Accountant only sees
  - [ ] Delete only if no product uses it
- [ ] Frontend: Categories page
  - [ ] Table
  - [ ] Add/edit dialog
  - [ ] Delete
- [ ] Lint and build pass
- [ ] Checked in browser: add, edit, and delete categories

## Step 7 — Products

- [ ] To confirm: block changing the unit once the product has stock?
- [ ] `Product` table: company, name, unit, category, code (optional, unique inside the
      company), active. No price field.
- [ ] API
  - [ ] Company Owner and Storekeeper manage
  - [ ] Accountant only sees
  - [ ] List: search by name or code, filter by category and active, paging
- [ ] Frontend: Products page
  - [ ] Table with filters
  - [ ] Add/edit dialog
- [ ] Lint and build pass
- [ ] Checked in browser: add products with units and categories, find them with filters

## Step 8 — Suppliers

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

## Step 9 — Stock-in documents

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

## Step 10 — Stock view

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
- [ ] Checked in browser: stock page shows what was added in step 9, with values

## Step 11 — Stock-out documents

- [ ] Shared: `StockOutReason` enum — Issued, Spoiled, Other
- [ ] Tables
  - [ ] `StockOut` (header): company, reason, date, receiver (staff), note, created by
  - [ ] `StockOutLine`: document, product, quantity. No price.
- [ ] Rules
  - [ ] Issued → receiver required (active staff only); Other → note required
  - [ ] Same line rules as stock-in (quantity above 0, decimals by unit)
  - [ ] Blocked if not enough stock — the error names the product
  - [ ] Only the creator can edit or delete
- [ ] API
  - [ ] Company Owner and Storekeeper create
  - [ ] Accountant only sees
- [ ] Frontend: list, form, and view pages — same layout as stock-in
- [ ] Lint and build pass
- [ ] Checked in browser: issue goods to the Chef, write off spoiled goods, stock goes
      down; issuing too much shows an error

## Step 12 — Redis cache

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

## Step 13 — Role check pass

- [ ] Seeder adds a demo company with one user per role (emails and passwords from env)
- [ ] Check every page and API for each role
  - [ ] Platform Owner
  - [ ] Company Owner
  - [ ] Storekeeper
  - [ ] Accountant
- [ ] Fix anything that does not match the roles table in [decisions.md](decisions.md)
- [ ] Lint and build pass
- [ ] Checked in browser: each role sees only its own menus and actions
