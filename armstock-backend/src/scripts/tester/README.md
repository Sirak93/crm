# Backend Tester

End-to-end tester for `armstock-backend`, built like armlytic's. Each side builds its own
database, starts its own backend, calls the **real HTTP API** with real logins, and checks
what came back and what is in the database. No test framework, no extra package.

This file is the coverage map. **Keep it up to date in the same task that adds or changes
an endpoint.**

## Running

```bash
npm test -w armstock-backend               # every side
npm run test:company -w armstock-backend   # only the company side
```

Each side, on its own:

1. creates a scratch database `armstock_tester_<side>` and builds it with `synchronize` (MVP);
2. seeds a Platform Owner with a random password, then runs the side's setup (the company
   side makes **two companies**, so cross-company access can always be checked);
3. starts its own backend on a free port with `NODE_ENV=test` and Redis index `15`, so a
   dev backend keeps running untouched;
4. runs its suites and prints each case in the terminal;
5. stops the backend and drops the database.

A side that can't be set up shows as one failed case; the other sides still run.
Exit code is 0 only when everything passed.

### Switches

Optional, off by default. Put them in front of the command, never in `.env`:

| Variable           | Effect                                                    |
| ------------------ | --------------------------------------------------------- |
| `VERBOSE=1`        | prints every request the tester sends                     |
| `SERVER_LOG=1`     | streams the backend's own log - where the cause of a 500 is |
| `KEEP_DB=1`        | keeps the scratch database instead of dropping it         |
| `TESTER_DB_NAME`   | another database name prefix (default `armstock_tester`)  |
| `TESTER_REDIS_DB`  | another Redis index (default `15`)                        |

The tester reads `DB_*`, `REDIS_*` and the rest from `armstock-backend/.env`, and ignores
`DB_NAME` - it always uses its own database. No test logins live in `.env`: every account
gets a random password per run, never printed.

Under `NODE_ENV=test` the rate limits get a very high ceiling (`RateLimiter.ts`), so a run
is never throttled. The rate-limits side (not built yet) will run with the real limits.

## Layout

| Folder        | What is in it                                                          |
| ------------- | ---------------------------------------------------------------------- |
| `core/`       | runner, HTTP client, asserts, scratch database, backend process, terminal reporter |
| `shared/`     | parts every suite reuses: companies and users, data builders, stock check, paths |
| `sides/`      | one file per side: its setup and its suites                            |
| `suites/`     | the cases, one file per suite                                          |
| `interfaces/`, `enums/` | the tester's own types                                       |

**Reuse rule:** a new suite only adds cases and, if needed, new helpers next to the old
ones. It never changes how an existing helper works - if a helper must change, that is its
own small task.

### Shared parts

- `Companies.createCompany` - a company through the platform API, with Owner, Storekeeper,
  Accountant, HR and Staff (no permissions), all logged in.
- `Accounts.createMember` - a logged-in user with exactly the permissions a case needs;
  `createNoLoginUser` - a user without login (a stock-out receiver).
- `Builders` - `createProduct`, `createSupplier`, `createStockIn`, `createStockOut`, with
  defaults; `stockInBody` / `stockOutBody` to send a slightly wrong body.
- `Stock.stockOf` / `expectStock` - a product's stock summed straight from the database.
- `Http.rejects` - checks error code, status, and that the message shows nothing internal;
  `Http.rejectsField` - a validation error that names the field.

## Coverage

### Company side

| Suite      | Covered                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| Stock-out  | rules per reason (Issued, Returned, Damaged, Expired, Other); fields that don't belong to the reason are dropped; "Not enough stock" with the available amount (one line, two lines of one product, several products, no stock at all); whole-number units; 3 decimals; zero/negative; future date; no lines; another company's product, supplier, receiver; archived supplier (new vs old return); archived product with stock; creator-only edit/delete (not the Owner, not another storekeeper); edit counts its own quantity; delete gives stock back; Accountant only sees; no permission; no token; Platform Owner; unknown and malformed uuid; other company can't see/edit/delete; list filters; paging; summary |

| Stock-in   | rules per reason (Purchase, Initial stock, Other); supplier and invoice dropped when not a purchase; line total vs quantity × price (rounding only); money 2 decimals, price 0, no negative; whole-number units; 3 decimals; future date; no lines; another company's product and supplier; archived product and supplier refused on new, kept on edit; edit up and down; edit/delete below what went out → "Not enough stock"; removing a product from the lines; edit replaces lines and header; creator-only edit/delete; delete takes stock away; Accountant only sees; no permission; no token; Platform Owner; unknown and malformed uuid; other company; list filters; paging; summary with total |
| Two saves at the same time | two stock-outs that don't fit together; many stock-outs at once; stock-out vs deleting / editing down its stock-in; two returns over the supplier's amount; a return vs editing its stock-in down; many stock-ins at once get their own numbers. Each runs 5 rounds |
| Returns to a supplier | the decisions.md example (20 L brought, 5 L returned: 25 refused "can return 15", 10 fine); a product it never brought (0); two returns that together go over; editing a return doesn't count itself; each supplier counted on its own; changing a return to another reason or deleting it frees the amount; a return the supplier allows still needs the stock |
| Stock-in after returns | 20 L brought, 15 L returned: edit to 18 and to 15 fine, to 10 refused; delete, change supplier, change Purchase to Other / Initial stock, replace the product - refused "returned 15 L"; other edits still work; two stock-ins from one supplier; after the return is deleted the stock-in can go |

### Still open

In order, as in `documents/planning/mvp-foundation/tasks.md` (Step 15):

- Stock balance
- Company isolation for every route; permissions for every route; auth and sessions
- Company users; roles; products; suppliers and contacts; categories; units; options; company profile
- Platform side: companies and their users; database and logs
- Rate-limits side; health
