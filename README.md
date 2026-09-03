# 1Fi — EMI Store

A full-stack storefront for buying phones on **EMI plans backed by mutual funds**.
Every product, variant, price, image and financing plan is served from PostgreSQL
through a REST API — there is no hardcoded catalogue data anywhere in the frontend.

Built for the 1Fi SDE1 assignment.

- **Live demo:** _add your deployed URL here_
- **Walkthrough video:** _add your video link here_

| | |
|---|---|
| Products | 5 (Apple, Samsung, Google, OnePlus, Nothing) |
| Variants | 37 (colour × capacity, each priced independently) |
| EMI plans | 35 (7 tenures per product: 3–60 months) |
| Mutual funds | 4 (each plan names the fund backing it) |

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Setup and run](#setup-and-run)
3. [Deploying](#deploying)
4. [Schema](#schema)
5. [API endpoints and example responses](#api-endpoints-and-example-responses)
6. [How the EMI is calculated](#how-the-emi-is-calculated)
7. [Performance](#performance)
8. [Project layout](#project-layout)
9. [Design notes](#design-notes)

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React 19** + **Next.js 15** App Router | Server Components render the product page from the API on first paint; a small client island owns the variant/plan selection. |
| Styling | **Tailwind CSS v4** | Design tokens live in `@theme` in `src/app/globals.css`; no config file needed. |
| Backend | **Next.js Route Handlers** (Node.js) | The REST API (`/api/*`) ships in the same deployable as the UI. |
| ORM | **Prisma 6** | Typed queries, versioned migrations, and a schema that doubles as documentation. |
| Database | **PostgreSQL 17** (Neon) | Relational data with real foreign keys; runs anywhere Postgres runs. |
| Language | **TypeScript** (strict) | End-to-end types from the database row to the rendered price. |

Product artwork is generated **SVG** (`scripts/generate-images.ts`) rather than binaries or
hot-linked CDN images, so the repo stays small, images stay crisp at any size, and a demo can
never break because someone else's CDN went down.

---

## Setup and run

### Prerequisites

- Node.js **20.9+** (developed on 24)
- A PostgreSQL database — local, Docker, Neon, Supabase, Railway, anything

### 1. Install

```bash
git clone <your-repo-url>
cd 1Fi
npm install
```

### 2. Configure the database

```bash
cp .env.example .env
```

Then edit `.env`:

```env
# Runtime connection (use the pooled host if your provider has one)
DATABASE_URL="postgresql://user:password@localhost:5432/onefi?schema=public"

# Direct connection, used for migrations only (bypasses any connection pooler)
DIRECT_URL="postgresql://user:password@localhost:5432/onefi?schema=public"
```

<details>
<summary>No Postgres handy? Start one with Docker</summary>

```bash
docker run --name onefi-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=onefi -p 5432:5432 -d postgres:17

# then in .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/onefi?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/onefi?schema=public"
```
</details>

### 3. Create the schema and seed it

```bash
npm run db:migrate     # applies prisma/migrations -> creates all 7 tables
npm run db:seed        # 4 funds, 5 products, 37 variants, 74 images, 35 EMI plans
```

The seeder is **idempotent** — every write is an upsert on a natural key, so you can re-run it
any time without duplicating rows.

> Prefer plain SQL? `db/schema.sql` and `db/seed.sql` are equivalent and need no Prisma:
> ```bash
> psql "$DATABASE_URL" -f db/schema.sql
> psql "$DATABASE_URL" -f db/seed.sql
> ```

### 4. Run

```bash
npm run dev     # http://localhost:3000
```

Confirm everything is wired up:

```bash
curl http://localhost:3000/api/health
# {"success":true,"data":{"status":"ok","database":"connected",
#   "counts":{"products":5,"variants":37,"emiPlans":35,"funds":4,"applications":0}, ...}}
```

### All scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply / create migrations |
| `npm run db:push` | Sync schema without a migration (prototyping) |
| `npm run db:seed` | Seed the catalogue (idempotent) |
| `npm run db:reset` | Drop, re-migrate and re-seed |
| `npm run db:studio` | Prisma Studio — browse the data |
| `npm run db:export` | Regenerate `db/schema.sql` + `db/seed.sql` |
| `npm run images:generate` | Regenerate the product SVGs |

---

## Deploying

The app is a single Next.js deployable — one service, no separate API server.

**Vercel**

1. Push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Add both environment variables (Settings → Environment Variables):
   - `DATABASE_URL` — connection string
   - `DIRECT_URL` — same host, used for migrations

   Pick the Neon region closest to where the functions run (Vercel defaults to
   `iad1`, US East), and see the note on pooled vs direct endpoints under
   [Performance](#performance).
3. Deploy. The build command (`prisma generate && next build`) is already set in `vercel.json`.
4. Seed the production database once, from your machine, with production credentials in `.env`:
   ```bash
   npx prisma migrate deploy   # applies prisma/migrations to the production DB
   npm run db:seed
   ```

Works the same on Render, Railway or Fly — it is an ordinary Node server (`npm run build`
then `npm start`).

---

## Schema

Seven tables. Full DDL in [`db/schema.sql`](db/schema.sql); the source of truth is
[`prisma/schema.prisma`](prisma/schema.prisma).

```
products ──┬── product_highlights          spec bullets
           │
           ├── variants ──── variant_images    colour × capacity, own price + gallery
           │       │
           │       └────────────┐
           └── emi_plans ───────┼──── emi_applications    a submitted "Proceed"
                   │            │
                   └── mutual_funds              the fund a plan is secured against
```

| Table | Holds | Key columns |
|---|---|---|
| `products` | A model line, one per URL | `slug` (unique, drives `/products/:slug`), `name`, `brand`, `isNew` |
| `product_highlights` | Spec bullets | `productId`, `label`, `value`, `position` |
| `variants` | A buyable configuration | `(productId, slug)` unique, `sku` unique, `colorName`, `colorHex`, `storage`, `mrpPaise`, `pricePaise` |
| `variant_images` | Gallery, per colourway | `variantId`, `url`, `alt`, `position` |
| `mutual_funds` | Collateral funds | `code` unique, `name`, `category`, `expectedReturnBps`, `riskLevel` |
| `emi_plans` | Financing **terms** | `(productId, tenureMonths)` unique, `interestRateBps`, `cashbackPaise`, `processingFeePaise`, `fundId` |
| `emi_applications` | A submitted plan | `reference` unique, snapshot of every amount at submission time |

Three decisions worth calling out:

**1. Money is stored as integer paise, rates as integer basis points.**
`pricePaise = 12740000` is ₹1,27,400; `interestRateBps = 1050` is 10.5%. No floats touch a
monetary value anywhere in the stack, so no rounding drift can accumulate. Formatting to
`₹1,27,400` happens once, at the API boundary.

**2. `emi_plans` stores terms, never a monthly amount.**
The instalment is derived from the price of the variant being viewed, at request time. That
is why a product with 9 variants needs only 7 plan rows instead of 63 — and why changing a
price can never leave a stale EMI figure behind in the database.

**3. `variants` carries the price, not `products`.**
A 256GB iPhone and a 1TB iPhone are different prices, so they are different rows. Images hang
off the variant too, which is what makes switching colour swap the gallery.

`emi_applications` is the exception to rule 2: it *does* store computed amounts, deliberately,
so that a later price change never rewrites an application somebody already submitted.

---

## API endpoints and example responses

Base URL: `http://localhost:3000`. Every response uses the same envelope:

```jsonc
{ "success": true,  "data": <payload>, "meta": { ... } }
{ "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "..." } }
```

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api` | Self-describing index of every endpoint |
| `GET` | `/api/health` | Database connectivity + row counts |
| `GET` | `/api/products` | Catalogue listing (`?brand=`, `?search=`) |
| `GET` | `/api/products/:idOrSlug` | One product: variants, images, per-variant EMI plans |
| `GET` | `/api/products/:idOrSlug/emi-plans` | Plans priced against one variant (`?variantId=`) |
| `POST` | `/api/emi-applications` | Submit the selected plan |
| `GET` | `/api/emi-applications/:reference` | Look up a submitted application |

`:idOrSlug` accepts either the slug (`iphone-17-pro`) or the cuid primary key.

---

### `GET /api/products`

Optional: `?brand=Apple`, `?search=pixel`.

```jsonc
{
  "success": true,
  "data": [
    {
      "id": "cmtl831s10004wmhwglw7a6xv",
      "slug": "iphone-17-pro",
      "name": "iPhone 17 Pro",
      "brand": "Apple",
      "category": "Smartphones",
      "tagline": "Aerospace-grade aluminium unibody with a vapour chamber.",
      "isNew": true,
      "url": "/products/iphone-17-pro",
      "image": {
        "url": "/images/iphone-17-pro-silver-back.svg",
        "alt": "iPhone 17 Pro in Silver, rear view"
      },
      "colors": [
        { "name": "Silver",        "hex": "#E4E5E7" },
        { "name": "Cosmic Orange", "hex": "#E5713A" },
        { "name": "Deep Blue",     "hex": "#2F4573" }
      ],
      "storageOptions": ["256GB", "512GB", "1TB"],
      "variantCount": 9,
      "startingPrice": { "paise": 12740000, "rupees": 127400, "display": "₹1,27,400" },
      "startingMrp":   { "paise": 13490000, "rupees": 134900, "display": "₹1,34,900" },
      "discountPercent": 6,
      "lowestMonthlyAmount": { "paise": 273800, "rupees": 2738, "display": "₹2,738" },
      "longestTenureMonths": 60,
      "emiPlanCount": 7
    }
    // ...4 more
  ],
  "meta": { "count": 5, "filters": { "brand": null, "search": null } }
}
```

Every amount is a `Money` object: `paise` is the canonical integer to compute with, `display`
is the pre-formatted Indian-notation string so every surface renders prices identically.

---

### `GET /api/products/iphone-17-pro`

The full payload the product page renders from — abridged here to one variant and two plans.

```jsonc
{
  "success": true,
  "data": {
    "id": "cmtl831s10004wmhwglw7a6xv",
    "slug": "iphone-17-pro",
    "name": "iPhone 17 Pro",
    "brand": "Apple",
    "isNew": true,
    "url": "/products/iphone-17-pro",
    "highlights": [
      { "label": "Display", "value": "6.3\" Super Retina XDR, 120Hz ProMotion" },
      { "label": "Chip",    "value": "A19 Pro, 6-core GPU" }
    ],
    "colors": [{ "name": "Silver", "hex": "#E4E5E7" }],
    "storageOptions": ["256GB", "512GB", "1TB"],
    "variantCount": 9,
    "defaultVariantId": "cmtl834lp000awmhw9da5eafb",
    "variants": [
      {
        "id": "cmtl834lp000awmhw9da5eafb",
        "sku": "IPHONE-17-PRO-SILVER-256GB",
        "slug": "silver-256gb",
        "colorName": "Silver",
        "colorHex": "#E4E5E7",
        "storage": "256GB",
        "label": "256GB · Silver",
        "mrp":     { "paise": 13490000, "rupees": 134900, "display": "₹1,34,900" },
        "price":   { "paise": 12740000, "rupees": 127400, "display": "₹1,27,400" },
        "savings": { "paise": 750000,   "rupees": 7500,   "display": "₹7,500" },
        "discountPercent": 6,
        "inStock": true,
        "isDefault": true,
        "images": [
          { "url": "/images/iphone-17-pro-silver-back.svg",  "alt": "iPhone 17 Pro in Silver, rear view" },
          { "url": "/images/iphone-17-pro-silver-front.svg", "alt": "iPhone 17 Pro in Silver, front view" }
        ],
        "emiPlans": [
          {
            "id": "cmtl8411r001cwmhwez9dbgfr",
            "tenureMonths": 3,
            "tenureLabel": "3 months",
            "interestRate": { "bps": 0, "percent": 0, "display": "0%" },
            "isZeroInterest": true,
            "isRecommended": false,
            "monthlyAmount":   { "paise": 4246700,  "rupees": 42467,  "display": "₹42,467" },
            "finalInstalment": { "paise": 4246600,  "rupees": 42466,  "display": "₹42,466" },
            "totalRepayment":  { "paise": 12740000, "rupees": 127400, "display": "₹1,27,400" },
            "totalInterest":   { "paise": 0,        "rupees": 0,      "display": "₹0" },
            "processingFee":   { "paise": 0,        "rupees": 0,      "display": "₹0" },
            "cashback":        { "paise": 750000,   "rupees": 7500,   "display": "₹7,500" },
            "totalPayable":    { "paise": 12740000, "rupees": 127400, "display": "₹1,27,400" },
            "effectiveCost":   { "paise": 11990000, "rupees": 119900, "display": "₹1,19,900" },
            "pledgedAmount":   { "paise": 15925000, "rupees": 159250, "display": "₹1,59,250" },
            "fund": {
              "code": "LIQ-ADV",
              "name": "1Fi Liquid Advantage Fund",
              "amc": "1Fi Asset Management",
              "category": "Liquid",
              "expectedReturn": { "bps": 690, "percent": 6.9, "display": "6.9%" },
              "riskLevel": "Low"
            }
          },
          {
            "id": "cmtl8411r001gwmhwez9dbgfv",
            "tenureMonths": 36,
            "tenureLabel": "36 months",
            "interestRate": { "bps": 1050, "percent": 10.5, "display": "10.5%" },
            "isZeroInterest": false,
            "isRecommended": false,
            "monthlyAmount":  { "paise": 414100,   "rupees": 4141,   "display": "₹4,141" },
            "totalRepayment": { "paise": 14907600, "rupees": 149076, "display": "₹1,49,076" },
            "totalInterest":  { "paise": 2167600,  "rupees": 21676,  "display": "₹21,676" },
            "processingFee":  { "paise": 49900,    "rupees": 499,    "display": "₹499" },
            "cashback":       { "paise": 750000,   "rupees": 7500,   "display": "₹7,500" },
            "totalPayable":   { "paise": 14957500, "rupees": 149575, "display": "₹1,49,575" },
            "effectiveCost":  { "paise": 14207500, "rupees": 142075, "display": "₹1,42,075" },
            "fund": { "code": "BAL-ADV", "name": "1Fi Balanced Advantage Fund", "category": "Hybrid", "riskLevel": "Moderate" }
          }
          // ...5 more tenures: 6, 12, 24, 48, 60
        ],
        "lowestMonthlyAmount": { "paise": 273800, "rupees": 2738, "display": "₹2,738" }
      }
      // ...8 more variants
    ]
  },
  "meta": { "variantCount": 9, "emiPlanCount": 7 }
}
```

**404:**

```jsonc
{ "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "No product found for \"does-not-exist\"." } }
```

---

### `GET /api/products/iphone-17-pro/emi-plans?variantId=<id or SKU>`

The same plan objects, scoped to one variant. Omit `variantId` for the product default.

```jsonc
{
  "success": true,
  "data": {
    "product": { "id": "cmtl831s1...", "slug": "iphone-17-pro", "name": "iPhone 17 Pro", "url": "/products/iphone-17-pro" },
    "variant": {
      "id": "cmtl834lp000awmhw9da5eafb",
      "sku": "IPHONE-17-PRO-SILVER-256GB",
      "label": "256GB · Silver",
      "price": { "paise": 12740000, "rupees": 127400, "display": "₹1,27,400" },
      "mrp":   { "paise": 13490000, "rupees": 134900, "display": "₹1,34,900" }
    },
    "emiPlans": [ /* 7 plans, exactly as above */ ]
  },
  "meta": { "count": 7 }
}
```

The full ladder for the ₹1,27,400 variant:

| Tenure | Rate | Monthly | Total repayment | Interest | Cashback |
|---|---|---|---|---|---|
| 3 months | 0% | ₹42,467 | ₹1,27,400 | ₹0 | ₹7,500 |
| 6 months | 0% | ₹21,233 | ₹1,27,400 | ₹0 | ₹7,500 |
| 12 months | 0% | ₹10,617 | ₹1,27,400 | ₹0 | ₹7,500 |
| 24 months | 0% | ₹5,308 | ₹1,27,400 | ₹0 | ₹7,500 |
| 36 months | 10.5% | ₹4,141 | ₹1,49,076 | ₹21,676 | ₹7,500 |
| 48 months | 10.5% | ₹3,262 | ₹1,56,576 | ₹29,176 | ₹7,500 |
| 60 months | 10.5% | ₹2,738 | ₹1,64,280 | ₹36,880 | ₹7,500 |

---

### `POST /api/emi-applications`

What the **Proceed** button calls. The server re-derives every amount from the stored variant
price and plan terms — the client's numbers are never trusted — then persists a snapshot.

```bash
curl -X POST http://localhost:3000/api/emi-applications \
  -H "content-type: application/json" \
  -d '{"variantId":"cmtl834lp000awmhw9da5eafb","emiPlanId":"cmtl8411r001ewmhwez9dbgft"}'
```

`201 Created`:

```jsonc
{
  "success": true,
  "data": {
    "reference": "1FI-SJ2WUA",
    "status": "PENDING",
    "createdAt": "2026-09-03T08:01:01.072Z",
    "product": { "name": "iPhone 17 Pro", "slug": "iphone-17-pro", "url": "/products/iphone-17-pro" },
    "variant": { "id": "cmtl834lp000awmhw9da5eafb", "label": "256GB · Silver", "sku": "IPHONE-17-PRO-SILVER-256GB" },
    "plan": {
      "id": "cmtl8411r001ewmhwez9dbgft",
      "tenureMonths": 12,
      "tenureLabel": "12 months",
      "interestRate": { "bps": 0, "percent": 0, "display": "0%" }
    },
    "principal":     { "paise": 12740000, "rupees": 127400, "display": "₹1,27,400" },
    "monthlyAmount": { "paise": 1061700,  "rupees": 10617,  "display": "₹10,617" },
    "totalPayable":  { "paise": 12740000, "rupees": 127400, "display": "₹1,27,400" },
    "cashback":      { "paise": 750000,   "rupees": 7500,   "display": "₹7,500" }
  }
}
```

Error cases:

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 422 | `VALIDATION_ERROR` | `variantId` or `emiPlanId` missing |
| 404 | `VARIANT_NOT_FOUND` / `PLAN_NOT_FOUND` | No such row |
| 409 | `VARIANT_OUT_OF_STOCK` | Variant is not sellable |
| 422 | `PLAN_PRODUCT_MISMATCH` | Plan belongs to a different product |

```jsonc
{ "success": false, "error": { "code": "PLAN_PRODUCT_MISMATCH", "message": "That EMI plan does not belong to the selected product." } }
```

---

### `GET /api/emi-applications/1FI-SJ2WUA`

Returns the same object, read back from `emi_applications` with the amounts exactly as they
were snapshotted.

---

## How the EMI is calculated

All of it lives in [`src/lib/emi.ts`](src/lib/emi.ts).

**Interest-bearing plans** use the standard reducing-balance formula, with `i` the monthly rate
(annual ÷ 12) and `n` the tenure:

```
      P × i × (1 + i)ⁿ
E = ────────────────────
       (1 + i)ⁿ − 1
```

**0% plans** would divide by zero there, so the principal is split evenly across the tenure.

The instalment is then rounded to a whole rupee, because that is how EMIs are quoted in India.
Rounding leaves a remainder, and the two plan families handle it differently:

- **0% plans repay exactly the price.** The total is pinned to the principal and the remainder
  lands on the final instalment — ₹1,27,400 over 24 months is `₹5,308 × 23 + ₹5,316`, totalling
  ₹1,27,400 and **₹0** interest. A 0% plan that quietly repaid ₹1,27,392 or ₹1,27,404 would be
  wrong in both directions.
- **Interest-bearing plans** are quoted the conventional way: instalment × tenure.

Worked example — ₹1,27,400 over 36 months at 10.5%:

```
i = 1050 bps ÷ 12 = 0.00875
(1.00875)³⁶ = 1.368345
E = 127400 × 0.00875 × 1.368345 ÷ 0.368345 = ₹4,141
total repayment  = 4141 × 36            = ₹1,49,076
interest         = 149076 − 127400      = ₹21,676
total payable    = 149076 + 499 (fee)   = ₹1,49,575
effective cost   = 149575 − 7500 (cashback) = ₹1,42,075
```


---

## Performance

The page you see is served from cache and renders in ~20 ms; a cold cache costs
one database round trip. Getting there took four changes, each measured on this
machine (Windows, India):

**1. Put the database near whatever queries it.** The first Neon project was in
`us-east-2` (Ohio). TCP connect from India measured **~1000 ms**, against 38 ms
to Mumbai and ~85 ms to Singapore. Neon has no Mumbai region, so the database
lives in `ap-southeast-1`. This one change was worth more than everything else
combined.

**2. Use the direct endpoint, not the pooler.** Neon hands out two hostnames;
the `-pooler` one runs pgbouncer. Six consecutive `SELECT 1` calls:

| Endpoint | Samples |
|---|---|
| `...-pooler...` | 85, **10011**, 79, 484, 1022, 82 ms |
| direct | 85, 80, 80, 91, 97, 87 ms |

The direct endpoint runs at exactly the network round trip. Prisma maintains its
own connection pool, so pgbouncer adds nothing for a long-lived Node server —
it earns its keep only when many short-lived serverless instances each open
connections. Both URLs therefore point at the direct host.

**3. One statement per page, not nine.** Prisma resolves an `include` tree with
a separate query per relation by default, so every extra relation costs another
round trip. `relationJoins` (enabled in `schema.prisma`) collapses the tree into
LATERAL joins:

| Query | Separate | Joined |
|---|---|---|
| Product page | 1063 ms | **529 ms** |
| Catalogue | 1430 ms (max 2694) | **1351 ms** (max 1478) |

**4. Cache the catalogue.** A product catalogue is read far more often than it
changes, so rendered pages reuse the API response for `CATALOGUE_TTL_SECONDS`
(60 s, in `src/lib/api-client.ts`) instead of hitting Postgres per visit:

| Page | Cold | Warm |
|---|---|---|
| `/` | 694 ms | **18–24 ms** |
| `/products` | 22 ms | **17–21 ms** |
| `/products/iphone-17-pro` | 932 ms | **21–25 ms** |

`/api/*` is deliberately left uncached, so JSON you `curl` is always live and
`POST /api/emi-applications` always writes. The trade-off is that a row edited
directly in the database can take up to 60 s to appear on a page — lower the
constant to 0 while demoing live edits.

### Want it faster still?

Every remaining millisecond is the ~85 ms hop to Singapore plus Neon's free-tier
0.25 vCU compute. Point `.env` at a PostgreSQL on your own machine and the same
queries run in about a millisecond:

```env
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/onefi?schema=public"
DIRECT_URL="postgresql://postgres:<password>@localhost:5432/onefi?schema=public"
```

```bash
npm run db:migrate && npm run db:seed
```

Keep the Neon URL for the deployed demo, where the database and the server are
in the same region anyway.

---

## Project layout

```
├── prisma/
│   ├── schema.prisma          # 7 models — the schema source of truth
│   ├── migrations/            # versioned DDL
│   ├── seed-data.ts           # the catalogue, in plain rupees
│   └── seed.ts                # idempotent upsert seeder
├── db/
│   ├── schema.sql             # plain-SQL DDL (generated)
│   └── seed.sql               # plain-SQL INSERTs (generated)
├── scripts/
│   ├── generate-images.ts     # renders the 28 product SVGs
│   └── export-sql.ts          # regenerates db/*.sql
├── public/images/             # generated artwork, referenced by variant_images.url
└── src/
    ├── app/
    │   ├── page.tsx                       # catalogue
    │   ├── products/page.tsx              # /products (+ ?brand= &search=)
    │   ├── products/[slug]/page.tsx       # /products/iphone-17-pro
    │   └── api/                           # every REST endpoint
    ├── components/            # ProductExperience, EmiPlanList, PlanSummary, ...
    └── lib/
        ├── emi.ts             # the instalment maths
        ├── money.ts           # paise/bps helpers + Indian digit grouping
        ├── catalog.ts         # Prisma queries -> API DTOs
        ├── api-client.ts      # server-side fetch of this app's own API
        ├── http.ts            # response envelope
        └── prisma.ts          # client singleton
```

---

## Design notes

**Pages read the API, not the database.** `/products/:slug` is a Server Component that does
`fetch("/api/products/:slug")` against its own API. It costs one in-process hop, and in return
the browser and the server render from exactly the same contract — if the API is wrong, the
page is visibly wrong too, rather than silently diverging.

**Variant switching does not hit the network.** `GET /api/products/:slug` returns every
variant with its plans already priced, so changing colour or capacity re-prices the whole
ladder instantly. Plan ids are stable across variants, so the tenure the customer picked stays
picked. The standalone `/emi-plans` endpoint exists for clients that want one variant only.

**Prices are formatted once, on the server.** `formatPaise` groups digits the Indian way by
hand rather than through `Intl.NumberFormat`, so server and client output are byte-identical
regardless of the runtime's ICU data — a mismatch there would be a hydration error on every
price on the page.

**Accessibility.** The plan ladder is a real `radiogroup` with `aria-checked`; colour and
capacity pickers expose `aria-pressed`; the confirmation dialog traps Escape, restores scroll
and takes focus on open; prices use tabular figures so columns do not jitter when values
change. `prefers-reduced-motion` disables the animations.

**Responsive.** Two columns from `lg` up, a single column below, verified down to 390px.

---

## Attribution

Product names and specifications are used illustratively for this assignment. Artwork is
generated vector art, not photography, and no manufacturer logos are reproduced. Prices are
representative and not real offers.
