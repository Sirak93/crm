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
- Companies and users have a status, not a yes/no flag — each its own enum
  (`CompanyStatus`, `UserStatus`), for now `ACTIVE` and `BLOCKED`; users also get
  `ARCHIVED`.
  - Blocked company → none of its users can log in.
  - Blocked user → that user cannot log in (still works here, stopped for now).
  - Archived user → left the company, kept for history. Cannot log in; hidden from the
    users list by default.
- No company delete in MVP (see "Later" in tasks.md).

## Roles

| Role | Can do |
| --- | --- |
| Platform Owner | Create companies, manage each company's users, see Database and Logs pages. Dashboard otherwise empty for now. |
| Company Owner | Everything Storekeeper and Accountant can do, plus manage the company's users and edit company info. |
| Storekeeper | Add/edit products and categories, create stock-in and stock-out documents, view stock, add/edit suppliers. |
| Accountant | View stock and movements (read-only), see prices and total stock value, manage suppliers. |
| Staff | No access — cannot log in (e.g. a Chef). Goods can be issued to them. |

Naming: Platform Owner code, route names, and API paths use `platform` (e.g.
`platform-logs`, `/api/platform/logs`), never `owner` — so it is not confused with the
Company Owner. Page paths stay short (`/database`, `/logs`).

Storekeeper can manage suppliers for now. Removing that later is just removing the role
from the route middleware.

## People: one Users table

- Every person in a company is a **User**: first name, last name, position (optional
  text), role, status, email, password.
- Role **Staff** = no access (Chef, Cook…): no password, email optional, cannot log in.
- Login roles (Company Owner, Storekeeper, Accountant) need an email and a password. The
  person who adds the user types the password by hand (no emails in MVP).
- Changing a user to Staff clears the password (the email is kept). Changing Staff to a
  login role needs a new password; between login roles the password is kept unless a new
  one is typed.
- Nobody can change their own role or status.
- Users are added from the users list only: the Company Owner on the "Users" page, the
  Platform Owner on a company's users page. Each has its own endpoints; both call one
  shared service.
- A stock-out can name a User (any role, including Staff) as the optional receiver.

## Units (measure units)

- Stored as `measure_units` (`MeasureUnit`) — "unit" alone could later mean a branch or
  department.

- Each company has its own list. A new company gets the defaults copied in:
  Հատ (հատ), Կիլոգրամ (կգ), Լիտր (լ), Մետր (մ).
- Company Owner and Storekeeper manage units; Accountant only views (same as categories
  and products — `CATALOG_MANAGER_ROLES`).
- Name and short name are unique inside the company (ignoring case).
- Each unit has an "allows decimals" flag (kg = yes, piece = no).
- Each product has one unit. All stock, prices, and movements use that unit. No unit
  conversion in MVP.

## Products and categories

- Product: name, unit, code/SKU (optional, unique within the company), category, status
  (`ProductStatus`: Active, Archived — archived = hidden from new documents, kept in
  history).
- The unit is fixed after the product is created (stock and prices are counted in it). A
  different packing (e.g. tomatoes in boxes) is a different product. Everything else can
  be edited.
- Categories (`product_categories`): a simple flat list per company, no sub-categories.
  A new company gets the defaults copied in (singular names): Բանջարեղեն, Միրգ, Միս,
  Ձուկ, Կաթնամթերք, Հացամթերք, Չոր մթերք, Ըմպելիք, Համեմունք, Տնտեսական ապրանք, Այլ.
- No price field on the product. Its current price is the average price from all its
  stock-ins (calculated, not saved). Wherever an average price is shown, mark it as average
  with a "~" before the number (e.g. ~360.00); the column header says "Avg price".
  Values built from it (quantity × average, total value) get "~" too.

## Stock

- One stock location per company in MVP (no multiple warehouses, no transfers).
- Stock can never go below zero. Any action that would make it negative is blocked
  ("Not enough stock"). The check uses the current total at the moment of saving, not
  the stock on the document's date (a date-based check is not for MVP). The error names
  each product with its available quantity and unit ("Not enough stock: Meat — available
  2 kg"), for stock-out and for stock-in edit/delete alike. No live stock hint in the
  form. Negative stock stays blocked in the first version; a per-company "allow negative
  stock" setting is a later idea (see "Later" in tasks.md).
- Stock value = quantity × average price. Average price = sum of all stock-in line
  totals ÷ sum of all stock-in quantities for that product. Stock-out lines have no cost.
- Stock quantity is not saved anywhere. It is counted in SQL each time: all stock-in lines
  minus all stock-out lines. A saved stock table can come later if it gets slow.

## Stock documents

Menu: **Stock** → In / Out / Balance. "Stock", not "Warehouse", matches the code
(`stock_ins`, `stock_outs`) and keeps "Warehouse" free for multiple warehouses later.

Both stock-in and stock-out are documents: a header plus one or more lines.

Each document gets a number like `IN-2026-0015` (stock-out: `OUT-…`): a counter per
company that restarts each year. Deleting the last one frees its number; gaps are fine.

**Stock-in** — header: reason, date, supplier, supplier's invoice number (optional,
Purchase only), note, created by. Lines: product, quantity,
price per unit, total. Total is saved so money matches the invoice exactly (3 kg for
1,000 ֏ stays 1,000, not 3 × 333.33 = 999.99).

| Reason | Rule |
| --- | --- |
| Purchase | Supplier required |
| Initial stock | No supplier (starting balance) |
| Other | No supplier, note required |

**Stock-out** — header: reason, date, supplier, department, receiver, note, created by.
Lines: product, quantity. No price.

| Reason | Where it went | Receiver | Note |
| --- | --- | --- | --- |
| Returned | Supplier, required | — | optional |
| Issued | Department, required (`StockOutDepartment`: Kitchen for now) | optional | optional |
| Damaged / Expired / Spoiled | — (a loss) | — | optional |
| Other | — | — | required |

Damaged, Expired and Spoiled stay separate so a later report can show why goods were lost.
The department is a code enum, not a table; more values are added when needed. The
receiver picker shows active users first, then blocked and archived ones with their tag,
because a document may be entered days after the person left.

Reasons are fixed enums in code (shown as a dropdown in the form).

**Fixing mistakes**

- Documents can be edited and deleted freely.
- Only the user who created a document can edit or delete it.
- An edit or delete is blocked if it would make stock go below zero.
- Archived products and suppliers can't be picked in a document; ones already in it stay
  and their rows can still be changed or deleted.
- Exception, stock-out only: an archived product can be picked while it still has stock
  (shown with an "Archived" tag in the picker), so what is left can be used up or written
  off. At 0 it drops out of the picker and the balance page. Stock-in never takes archived
  products.
- When a user leaves, their documents will be reassigned (handled later, ignored in MVP).

## Suppliers

- Supplier (`suppliers`): name (shown as "Firm name"), tax ID (ՀՎՀՀ), note (shown as "Firm
  note"), status. Only the name is required. The name is unique inside the company (ignoring case, archived
  ones included).
- Status (`SupplierStatus`: Active, Archived — archived = hidden from new documents, kept
  in old ones). The list starts on Active.
- Contacts (`supplier_contacts`): a supplier has zero or more contacts — name (shown as
  "Contact name", required), position (free text, e.g. Manager, Driver), phone, note. E.g.
  a firm's manager takes the orders and a second person delivers. Contacts have their own
  endpoints and are managed from the firm's expanded row (add/edit popup, delete); the
  firm popup has no contacts. After a firm is created, the "Add contact" popup opens.
  Contacts are deleted with the firm.
- A supplier can be deleted only if no stock-in document uses it; otherwise it is
  archived.
- Company Owner, Storekeeper, and Accountant all manage suppliers (`COMPANY_LOGIN_ROLES`).

## Stack

- **Monorepo** with npm workspaces, everything in TypeScript.
- **Frontend:** Vue 3 SPA (Vite), Pinia, vue-router, vue-i18n, Element Plus (no
  Bootstrap), iziToast for toasts and SweetAlert2 for confirm dialogs (like armlytic),
  lucide icons. One frontend for all roles.
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
