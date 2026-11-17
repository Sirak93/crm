# MVP Foundation — Decisions

Everything agreed so far for the Armstock MVP. This file changes while we build. Once the
skeleton is done and decisions settle, its content moves into `CLAUDE.md` (Project
Overview) and `README.md`, and this folder moves to `documents/completed/`.

## What the app is

Armstock is a stock (warehouse) app for companies. Many companies use one app, and each
company's data is kept apart.

## Companies and users

- One company has many users. A user belongs to one company only (no many-to-many in MVP).
- The Platform Owner has no company.
- No public sign-up. The Platform Owner creates companies and manages their users.

## Roles

| Role | Can do |
| --- | --- |
| Platform Owner | Create companies, manage each company's users, see Database and Logs pages. Dashboard otherwise empty for now. |
| Company Owner | Everything Storekeeper and Accountant can do, plus manage the company's users and edit company info. |
| Storekeeper | Add/edit products and categories, create stock-in and stock-out documents, view stock, add/edit suppliers. |
| Accountant | View stock and movements (read-only), see prices and total stock value, manage suppliers. |

Naming: Platform Owner code, route names, and API paths use `platform` (e.g.
`platform-logs`, `/api/platform/logs`), never `owner` — so it is not confused with the
Company Owner. Page paths stay short (`/database`, `/logs`).

Storekeeper can manage suppliers for now. Removing that later is just removing the role
from the route middleware.

## People: CompanyStaff and User

- **CompanyStaff** — every person in the company (Chef, Cook, Accountant, Storekeeper…):
  name, position, active yes/no.
- **User** — login data only (email, password, role), with an optional link to a
  CompanyStaff record.
- A Chef is a staff record with no user (cannot log in). An Accountant is a staff record
  plus a user.
- Goods are issued to a CompanyStaff record.

## Units

- One global list (piece, kg, liter, meter…), seeded at start, managed later by the
  Platform Owner.
- Each unit has an "allows decimals" flag (kg = yes, piece = no).
- Each product has one unit. All stock, prices, and movements use that unit. No unit
  conversion in MVP.

## Products and categories

- Product: name, unit, code/SKU (optional, unique within the company), category, active
  yes/no.
- Categories: a simple flat list per company, no sub-categories.
- No price field on the product. Its current price is the price from its last stock-in.

## Stock

- One stock location per company in MVP (no multiple warehouses, no transfers).
- Stock can never go below zero. Any action that would make it negative is blocked
  ("Not enough stock").
- Stock value = quantity × last stock-in price.

## Stock documents

Both stock-in and stock-out are documents: a header plus one or more lines.

**Stock-in** — header: reason, date, supplier, note, created by. Lines: product, quantity,
price per unit.

| Reason | Rule |
| --- | --- |
| Purchase | Supplier required |
| Initial stock | No supplier (starting balance) |
| Other | No supplier, note required |

**Stock-out** — header: reason, date, receiver, note, created by. Lines: product,
quantity. No price.

| Reason | Rule |
| --- | --- |
| Issued | Receiver (CompanyStaff) required |
| Spoiled | No receiver |
| Other | No receiver, note required |

Reasons are fixed enums in code (shown as a dropdown in the form).

**Fixing mistakes**

- Documents can be edited and deleted freely.
- Only the user who created a document can edit or delete it.
- An edit or delete is blocked if it would make stock go below zero.
- When a user leaves, their documents will be reassigned (handled later, ignored in MVP).

## Suppliers

Name, contact person, phone, email, tax ID, note (all optional except name), active yes/no.

## Stack

- **Monorepo** with npm workspaces, everything in TypeScript.
- **Frontend:** Vue 3 SPA (Vite), Pinia, vue-router, vue-i18n, Element Plus only (no
  Bootstrap, no extra popup/toast libraries). One frontend for all roles.
- **Backend:** Node + Express, Zod validation.
- **Database:** PostgreSQL + TypeORM. During MVP `synchronize: true` (entity changes
  only). After MVP: migrations only.
- **Redis:** caching (units, categories, products). Stock quantities are never cached.
- **i18n:** set up from the start, English only for now.
- **Loggers:** copied from armlytic — backend `AppLogger` (console) and `ApiLogger`
  (one row per request in the `api_logs` table, on/off with the `API_DB_LOG_ENABLED`
  env value — may move to an owner-switchable setting later); frontend `AppLogger`.
  No file logs.

## Auth

Copied from armlytic as is: email + password, JWT access + refresh tokens (refresh
tokens stored hashed on the server), tokens kept in JS-readable cookies and sent as a
Bearer header. Includes the ngrok headers for dev testing.

## Repo structure

```
armstock/
├── armstock-assets/    ← name, logos (used by frontend and backend, e.g. emails)
├── armstock-shared/    ← enums, constants, interfaces, small helpers
├── armstock-backend/   ← Express + TypeORM + Redis
└── armstock-frontend/  ← Vue 3 SPA
```

Dev ports (differ from armlytic's 4000/4001 so both can run at the same time):

- Backend: **4200**
- Frontend: **4201**

Local Postgres and Redis are shared with armlytic: Armstock has its own database
`armstock`, and every Redis key starts with `armstock:`.

## Branding

- Name: **Armstock**.
- Same look as armlytic (colors, fonts, CSS partials, Element Plus theme), with its own
  logo: three stacked boxes plus "Armstock" in Inter 800.
- Logos live in `armstock-assets/brand/`.

## Implementation steps

See [tasks.md](tasks.md).
