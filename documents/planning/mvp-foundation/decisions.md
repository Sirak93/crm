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
  - Archived user → left the company, kept for history. Cannot log in. The users list
    shows everyone sorted Active → Blocked → Archived, with a single-select status filter
    (starts empty). Restore always sets the user back to Active.
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

## Permissions (from Step 14)

From Step 14 the roles table above is only where the **default roles** start. Roles become
company records the Owner edits, and every user has their own permission list.

**Account type** - a code enum on the user (today's `role` column), separate from the
company role:

| `account_type` | Meaning |
| --- | --- |
| `PLATFORM_OWNER` | The platform owner |
| `COMPANY_OWNER` | The **one** owner of a company - always exactly one |
| `COMPANY_MEMBER` | Everyone else: has a company role (`role_uuid`) and their own `permissions` |

**Company roles** (`roles`: company, name, `permissions int[]`)

- A role is a group name plus a starting permission set - a template, nothing more.
- Roles are added, edited, and deleted by the Owner or anyone with `MANAGE_USER_PERMISSIONS`.
- A role can't be deleted while any user (active, blocked, or archived) has it; the error
  says how many ("3 users have this role. Move them to another role first.").
- New company: seeded from a code map `DEFAULT_ROLE_PERMISSIONS` keyed by a small
  `DefaultRole` enum - **Storekeeper, Accountant, HR**. After that the company edits its own
  copy; the code map only matters for new companies. There is no Staff role any more.
- Editing a role's permissions asks: "Also apply to the N users with this role? Their own
  changes will be replaced." Yes overwrites their lists; No leaves them as they are.

**User permissions** (`users.permissions`, Postgres `int[]`, the full list)

- Copied from the role on user create and on role change; then edited per user (e.g. an HR
  lead gets "Edit user" and "Manage user permissions", the HR intern only "Add user").
- No separate table - the list is small and always read together with the user. A history
  of who changed what can come later as a separate log table.
- **Who may raise someone's rights.** Every way to give rights goes through
  `MANAGE_USER_PERMISSIONS`; the other user permissions never do:

  | Permission | Allows | Does not allow |
  | --- | --- | --- |
  | `USER_ADD` | Create a user and pick their role (gets the role's compact defaults) | Anything on existing users |
  | `USER_EDIT` | Name, position, login, email, password, block, archive | Changing the role, the user's permissions, or role permissions |
  | `MANAGE_USER_PERMISSIONS` | Everything about rights: roles and their permissions, others' permissions, changing an existing user's role (it copies the role's set) | Own permissions and own role |

  **Rule:** anything that touches roles, role permissions, a user's role, or a user's
  permissions = Company Owner || `MANAGE_USER_PERMISSIONS` (|| Platform Owner, later). No
  permission is owner-only.

  At first only the Owner has these. `MANAGE_USER_PERMISSIONS` can be granted, so the Owner
  hands the day-to-day work to trusted people (e.g. an HR lead) instead of granting every
  access personally. Password and login changes sit in `USER_EDIT`, which the Owner gives
  only to trusted people - with it, someone could log in as another user.
- **Role templates stay compact**: each default role starts with only the basics for its
  job, so creating a user with `USER_ADD` never hands out much. More is added per user by
  someone with `MANAGE_USER_PERMISSIONS`.
- **Nobody can change their own permissions or role** (read-only panel on your own account;
  the API refuses too). Anyone with `MANAGE_USER_PERMISSIONS` may grant any permission to
  others.

**Permission list and default roles** (`✓` = on in that role's template). Every action is
its own permission; the panel groups them, with a group switch, but each one can be turned
on or off separately.

| Group | Permission | Storekeeper | Accountant | HR |
| --- | --- | :-: | :-: | :-: |
| Company | `COMPANY_EDIT` | | | |
| Users | `USER_VIEW` | | | ✓ |
| | `USER_ADD` | | | ✓ |
| | `USER_EDIT` (incl. email, password, login) | | | |
| | `MANAGE_USER_PERMISSIONS` | | | |
| Units | `UNIT_ADD`, `UNIT_EDIT`, `UNIT_DELETE` | ✓ ✓ ✓ | | |
| Categories | `CATEGORY_ADD`, `CATEGORY_EDIT`, `CATEGORY_DELETE` | ✓ ✓ ✓ | | |
| Products | `PRODUCT_VIEW` | ✓ | ✓ | |
| | `PRODUCT_ADD`, `PRODUCT_EDIT` | ✓ ✓ | | |
| | `PRODUCT_ARCHIVE`, `PRODUCT_DELETE` | ✓ ✓ | | |
| Suppliers | `SUPPLIER_VIEW` | ✓ | ✓ | |
| | `SUPPLIER_ADD`, `SUPPLIER_EDIT` | | ✓ ✓ | |
| | `SUPPLIER_ARCHIVE`, `SUPPLIER_DELETE` | | ✓ ✓ | |
| Supplier contacts | `SUPPLIER_CONTACT_ADD`, `SUPPLIER_CONTACT_EDIT`, `SUPPLIER_CONTACT_DELETE` | ✓ ✓ ✓ | ✓ ✓ ✓ | |
| Stock | `STOCK_BALANCE_VIEW` | ✓ | ✓ | |
| | `STOCK_IN_VIEW`, `STOCK_IN_CREATE` | ✓ ✓ | ✓ | |
| | `STOCK_OUT_VIEW`, `STOCK_OUT_CREATE` | ✓ ✓ | ✓ | |

- `USER_EDIT` is off for HR by default: with it someone can change another user's password
  and log in as them, so the Owner gives it only to HR people they trust.
- Units and categories have no view permission - they are reference data every logged-in
  member reads (product form, filters). Their pages show for anyone with one of their
  permissions.
- Stock documents: edit and delete stay creator-only and need the matching `*_CREATE`.
- Delete needs both the permission and the data rule: units, categories, products, and
  suppliers can be deleted only while nothing uses them.
- **Product delete** is new in Step 14: allowed only while the product is in no stock-in or
  stock-out line (like supplier delete); otherwise archive it.

**Company dashboard** (`/`, the home page of every company member who can log in - no
permission needed to open it, so the "lost access" popup always lands safely). Cards use
data the app already has; each shows only with its permission (the Owner sees all):

| Card | Shows | Needs |
| --- | --- | --- |
| Quick actions | New stock-in, New stock-out, New product, New supplier, Add user - each button only with its permission | `STOCK_IN_CREATE`, `STOCK_OUT_CREATE`, `PRODUCT_ADD`, `SUPPLIER_ADD`, `USER_ADD` |
| Stock value | ~Total stock value, products in stock (like the Balance page cards) | `STOCK_BALANCE_VIEW` |
| Stock in, this month | Documents and ~total money | `STOCK_IN_VIEW` |
| Stock out, this month | Documents and products | `STOCK_OUT_VIEW` |
| Latest stock-ins | Last 5: number, date, supplier, total - each a link | `STOCK_IN_VIEW` |
| Latest stock-outs | Last 5: number, date, reason, where to - each a link | `STOCK_OUT_VIEW` |
| Users | Active / blocked counts, link to Users | `USER_VIEW` |

- No card at all (no permissions yet): an empty state - "You have no access yet. Ask your
  manager to give you permissions."
- Each card loads on its own, with its own loading and error state; one failing card
  doesn't hide the others.
- Layout: quick actions on top, then the number cards in one row, then the two "latest"
  lists side by side; everything stacks on small screens.
- By default: Storekeeper sees quick actions (stock-in, stock-out, product), stock value,
  both monthly cards, and both latest lists; Accountant the same with the "New supplier"
  action instead; HR the "Add user" action and the Users card.

**Login is per user**, not per role: whoever creates or edits the account chooses "Can log
in". Yes = email and password required, permissions apply. No = no email, no password, no
permissions (panel hidden); the person can still be a stock-out receiver. This replaces
the Staff role.

**Company Owner**

- Exactly one per company, created with the company by the Platform Owner.
- Only the Platform Owner can touch the Owner account. Inside the company nobody can edit,
  block, archive, or change it; the Owner role can't be given to anyone.
- Has every permission without storing them: `permissions` stays empty.
- Transferring ownership: a Platform Owner action, in a later phase.

**Checks** - one rule on both sides:
`can(p) = user.accountType === COMPANY_OWNER || user.permissions.has(p)`. The API sends
`permissions` as an array; the frontend `UserModel` and the backend auth snapshot turn it
into a `Set` once, so the many checks are direct lookups.
`PermissionMiddleware(Permission.X)` on the API, `can(Permission.X)` and `meta.permission`
on routes in the frontend. A change applies on the user's next request (auth cache).

**Pages vs pickers.** Pages and actions need their permission. Picker lists (product,
supplier, receiver, role pickers, and the supplier filters) use small `/options/*`
endpoints open to every logged-in member of the company. They return only what a picker
needs - for products the `IStockLineProduct` shape, so a picked row knows its unit and
whether decimals are allowed - and never prices, stock amounts, or emails. So a form never
breaks because its user lacks a view permission of another area.

**Moving over.** No migration of old users: the old `role` column and `UserRole` enum are
replaced, and the local database is dropped and recreated. A dev seeder
(`npm run seed:dev`, development only) fills it again - a demo company with the Owner, a
Storekeeper, an Accountant, an HR user, and a user without login. Emails and the shared
password come from `.env`, never from code.

**Losing access while using the app.** Frontend gets permissions with the user (login and
app load). When a request is refused with 403, it reloads the user. If the open page is no
longer allowed - after a 403 or on a page reload - one generic popup explains it, and OK
reloads the app at `/` (the user's own dashboard). Typed data on that page is lost.

## People: one Users table

> Until Step 14. From then, roles, login, and Staff follow "Permissions (from Step 14)" above.

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
- Two saves at the same time: each stock save first locks the rows of the products on
  its document (`FOR NO KEY UPDATE`, sorted by uuid so no deadlock). A second save on the same
  product waits a few milliseconds, then its check sees the first save. No `lock_timeout`
  in MVP.
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

**Returns to a supplier.** You can't return more to a supplier than that supplier brought:
returnable = brought by that supplier (its stock-in lines) − already returned to it (its
Returned stock-outs, not counting the document being saved). A product the supplier never
brought has 0 returnable. Counted in SQL from the document lines, nothing new is stored.
Example: S1 brought 20 L of beer and 5 L were returned - returning 10 L is fine, 25 L is
refused ("Beer — can return 15 L"), and a product S1 never brought is refused ("can return
0"). The product picker for a return shows only products that supplier brought.

The same rule guards stock-in edit and delete: what the old supplier brought must stay at
least what was returned to it. With 20 L brought and 15 L returned, editing to 18 L is fine;
editing to 10 L, deleting the stock-in, changing its supplier, or changing Purchase to
another reason is refused ("Already returned to S1: Beer — returned 15 L"). Only the old
supplier is checked - the new one only gains.

Both checks run inside the save, under the product lock, next to the normal stock check.
Not covered: which delivery the goods came from (batches) - only the totals per supplier.

**Fixing mistakes**

- Documents can be edited and deleted freely.
- Only the user who created a document can edit or delete it.
- An edit or delete is blocked if it would make stock go below zero, or (stock-in) below
  what was already returned to its supplier.
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
