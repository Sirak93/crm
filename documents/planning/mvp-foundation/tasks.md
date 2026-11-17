# MVP Foundation — Tasks

Each step is one small, finished piece — backend and frontend together — so it can be
reviewed in code and checked in the browser. One step = one review = one commit.

Every CRUD step includes loading, empty, and error states, and all texts go through i18n.
Decisions behind these steps: [decisions.md](decisions.md).

| # | Step | What you can see after it | Status |
| --- | --- | --- | --- |
| 1 | **Skeleton** — workspaces, shared, backend (Express, logger, Postgres, Redis), frontend (Vite, Element Plus, i18n, brand styles, logo) | App opens on 4201 with the Armstock logo; backend health check works | To do |
| 2 | **Login** — User entity, seeded Platform Owner (from env), login/logout/refresh, role-based routes and layout | Log in as Platform Owner and see the empty dashboard | To do |
| 3 | **Companies** — Platform Owner CRUD | Create, edit, list, and turn off companies | To do |
| 4 | **Staff + users** — CompanyStaff, link to User, Platform Owner adds the Company Owner, Company Owner manages staff and users | Log in as Company Owner, add a Chef (no login) and a Storekeeper (with login) | To do |
| 5 | **Units** — seed + Platform Owner CRUD | Units list with the "allows decimals" flag | To do |
| 6 | **Categories** — CRUD | Category list per company | To do |
| 7 | **Products** — CRUD | Product list with filters by category and active | To do |
| 8 | **Suppliers** — CRUD | Supplier list | To do |
| 9 | **Stock-in documents** — create, list, view, edit, delete (creator-only, no-negative rule) | Add a purchase, see its lines and prices | To do |
| 10 | **Stock view** — quantity, last price, value, total value | Stock page fills from step 9 | To do |
| 11 | **Stock-out documents** — same as step 9, with reasons and receiver | Issue goods to the Chef, stock goes down | To do |
| 12 | **Redis cache** — units, categories, products | Faster lists, cache clears on change | To do |
| 13 | **Role check pass** — each role sees and does only what it should | Log in as each role and check menus and actions | To do |
