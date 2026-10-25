# VELA Atelier

A luxury watch store built with **React + Vite**, a **Node.js + Express** API, and a real **SQLite** database. Original product imagery, an editorial ivory-and-oxblood palette, and a complete shopping flow.

## Start in VS Code

Install **Node.js 24 or newer** first. The built-in SQLite API avoids native database drivers and compilation steps.

```sh
git clone https://github.com/galsapir123/vela-atelier.git
cd vela-atelier
npm ci
npm run dev
```

Open **http://localhost:5173**. Optional: run `code .` to open this folder in VS Code.

`npm run dev` starts both services:

| Service      | Address               | Purpose                         |
| ------------ | --------------------- | ------------------------------- |
| React / Vite | http://localhost:5173 | The storefront, with hot reload |
| Express      | http://localhost:3001 | API and SQLite access           |

Vite forwards `/api` requests to Express. Stop both with **Ctrl+C**.

## What works

- Three seeded fictional luxury watches with original generated product photography.
- Product details, specifications, stock display, and quantity selection.
- Collection filters, text search, sorting, and saved watches.
- Shopping bag with quantity updates, removal, and browser persistence.
- Delivery form and a working **demo checkout**.
- Server-calculated prices and delivery; client-supplied totals are rejected.
- Atomic inventory reduction and order/item persistence in SQLite.
- Idempotent checkout retries: the same request key cannot create a duplicate order.
- Order lookup using the random order reference and matching checkout email.
- Newsletter subscriptions stored and deduplicated in SQLite.
- Mobile layouts, keyboard-accessible native dialogs, reduced-motion support, live Geneva clock, and subtle hero parallax.

**This is a store demo.** No card details, payment processing, shipping, or email delivery are connected. Use sample customer details. Product specifications and brand are fictional. Currency is USD; demo totals include the displayed delivery fee and do not calculate real taxes or duties.

## Database

The database is created and seeded automatically at:

```text
server/data/vela.sqlite
```

It is a real persistent SQLite file. Restarting the API preserves orders, subscribers, and remaining inventory. It is deliberately excluded from Git, along with SQLite WAL files. Every clone gets a clean store.

### Tables

| Table         | Contents                                                                           |
| ------------- | ---------------------------------------------------------------------------------- |
| `products`    | Product identifiers, integer-cent prices, stock, and display metadata              |
| `orders`      | Customer delivery details, totals, random references, idempotency keys, and status |
| `order_items` | Order lines with a snapshot of the name and unit price                             |
| `subscribers` | Unique normalized email addresses                                                  |

Foreign keys, quantity/stock checks, WAL mode, and a busy timeout are enabled. Checkout runs inside `BEGIN IMMEDIATE` / `COMMIT`, with rollback on failure.

To inspect the file in VS Code, use a SQLite viewer extension. Do not edit inventory while the server is writing orders. Stop the API before copying the database for a backup, and include associated WAL files if they remain. Resetting the demo requires removing the database and its `-wal` / `-shm` companions **while the API is stopped**; this permanently removes local demo orders.

### Optional configuration

Copy `.env.example` to `.env` to change the API port or database location. No environment file is needed for the default setup. If changing the API port during development, update the proxy target in `vite.config.js` too.

## Project map

| Path                                 | Responsibility                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `client/src/App.jsx`                 | Storefront sections, catalog state, filters, saved watches, and dialog orchestration                               |
| `client/src/components/`             | Hero, journal, editorial content, product detail, cart, checkout, order lookup/receipt, icons, and reusable dialog |
| `client/src/hooks/useStoredState.js` | Validated, fault-tolerant browser storage                                                                          |
| `client/src/api.js`                  | Shared API requests, timeout/error handling, and price formatting                                                  |
| `client/src/styles.css`              | Numbered style sections, theme tokens, component layouts, and responsive overrides                                 |
| `client/public/images/`              | Original optimized product images                                                                                  |
| `server/app.js`                      | Express routes, validation errors, headers, rate limits, and production static serving                             |
| `server/database.js`                 | SQLite schema and first-run seeding                                                                                |
| `server/catalog.js`                  | Fictional seed product definitions                                                                                 |
| `server/orders.js`                   | Authoritative order calculation and transactional inventory updates                                                |
| `server/validation.js`               | Input schemas                                                                                                      |
| `server/tests/store.test.js`         | API and database integration tests                                                                                 |
| `scripts/dev.js`                     | Cross-platform launcher for the API and Vite                                                                       |

Change typography/colors in the variables at the start of `styles.css`. Edit the initial catalog in `server/catalog.js`; existing databases are intentionally not overwritten by seeding. For an existing database, make explicit data updates or reset only disposable demo data.

## API

| Method | Route                | Purpose                                    |
| ------ | -------------------- | ------------------------------------------ |
| GET    | `/api/health`        | API/database health                        |
| GET    | `/api/products`      | Catalog and delivery policy                |
| GET    | `/api/products/:id`  | One product                                |
| POST   | `/api/orders`        | Validate and save a demo order             |
| POST   | `/api/orders/lookup` | Find an order with its reference and email |
| POST   | `/api/newsletter`    | Store an email subscription                |

### Example order

Send a fresh UUID in `Idempotency-Key`. Reuse it only when retrying the **same** payload after a failed connection. A changed payload with the same key returns `409`.

```json
{
  "customer": {
    "name": "Alex Morgan",
    "email": "alex@example.com",
    "address": "12 Sample Avenue",
    "city": "New York",
    "postalCode": "10001",
    "country": "US"
  },
  "items": [{ "productId": "solstice-rose", "quantity": 1 }]
}
```

Country codes: `US`, `IL`, `GB`, `FR`, `DE`, `AE`, `CA`, `AU`. Each order contains 1–3 distinct products and 1–5 units of each. Unknown fields, including client prices/totals, are rejected. All amounts use integer cents. Delivery is $25, or free from $2,500.

Lookup body:

```json
{ "orderNumber": "VLA-REFERENCE_FROM_YOUR_RECEIPT", "email": "alex@example.com" }
```

There is no public endpoint to list all orders. Receipts exclude delivery addresses and emails.

## Checks and formatting

```sh
npm run check
```

This runs formatting validation, 14 integration tests, and a production React build. Tests use temporary databases and never touch your local store data.

```sh
npm run format       # Format source consistently
npm test             # API and database tests only
npm run build        # Build React into dist/
```

Test coverage includes persistence, totals, delivery thresholds, validation, order lookup, newsletter deduplication, stock rollback, competing purchases, and duplicate-request protection.

## Run the production build

```sh
npm ci
npm run build
npm start
```

Open **http://localhost:3001**. Express serves both the built React files and the API from one origin. The default production entry point uses the same SQLite file as development. Set `NODE_ENV=production` in the hosting environment for production headers.

**GitHub stores the source code. GitHub Pages cannot run this Node.js/SQLite backend.** To put the complete app online, run it on a Node-capable server or container with a persistent disk for `server/data`. Do not use ephemeral storage for the database.

An optional Docker setup is included:

```sh
docker build -t vela-atelier .
docker run --name vela -p 3001:3001 -v vela-data:/app/server/data vela-atelier
```

The named volume preserves SQLite between container replacements.

## Scope before real commerce

This project is a functional demo, not a payment-enabled production shop. Before taking actual orders, connect a payment provider with verified webhooks, add authenticated administration, define tax/shipping/returns policies, configure backups and HTTPS, review data retention, and add operational monitoring. Rate limits currently use process memory and are designed for one server instance. Configure Express proxy trust for your actual reverse proxy before deploying behind one; do not trust arbitrary forwarded headers.

## Assets

See `ASSETS.md` for image provenance and generation briefs. All watch photography is fictional concept imagery. Google Fonts provides Cormorant Garamond and DM Sans, with local fallbacks. No third-party watch brand assets are used.
