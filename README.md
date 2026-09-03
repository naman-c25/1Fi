# 1Fi — EMI Store

A MERN storefront for buying phones on **EMI plans backed by mutual funds**.
Every product, variant, price, image and financing plan is served from MongoDB
through a REST API — there is no hardcoded catalogue data anywhere in the React app.

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
3. [Schema](#schema)
4. [API endpoints and example responses](#api-endpoints-and-example-responses)
5. [How the EMI is calculated](#how-the-emi-is-calculated)
6. [Deploying](#deploying)
7. [Project layout](#project-layout)
8. [Design notes](#design-notes)

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | **React 19** + **Vite 8** + **React Router 7** |
| Styling | **Tailwind CSS v4** (tokens in `@theme`, no config file) |
| Backend | **Node.js** + **Express 5** |
| Database | **MongoDB 8** with **Mongoose 8** |
| Language | **JavaScript** (ESM) throughout — no build step on the server |

Two workspaces in one repo: `server/` (the API) and `client/` (the React app).
`npm run dev` starts both.

Product artwork is generated **SVG** (`scripts/generate-images.mjs`) rather than binaries or
hot-linked CDN images, so the repo stays small, images stay crisp at any size, and a demo can
never break because someone else's CDN went down.

---

## Setup and run

### Prerequisites

- Node.js **20.9+**
- MongoDB running locally (or a MongoDB Atlas connection string)

### 1. Install

```bash
git clone <your-repo-url>
cd 1Fi
npm install          # installs both workspaces
```

### 2. Point the API at MongoDB

```bash
cp server/.env.example server/.env
```

The default already works for a standard local install:

```env
MONGODB_URI="mongodb://127.0.0.1:27017/onefi"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

<details>
<summary>No MongoDB installed? Start one with Docker</summary>

```bash
docker run --name onefi-mongo -p 27017:27017 -d mongo:8
```
</details>

<details>
<summary>Using MongoDB Atlas instead</summary>

Create a free cluster, add a database user, allow your IP under Network Access, then:

```env
MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/onefi?retryWrites=true&w=majority"
```

**Mind the `/onefi` before the `?`.** The string Atlas shows in its Connect dialog ends
`...mongodb.net/?appName=Cluster0` with no database name, and MongoDB then quietly uses one
called `test` — so the API connects successfully and serves an empty catalogue, which looks
like a broken app rather than a misconfigured URI. `connectToDatabase` falls back to `onefi`
and logs a warning when the name is missing, but naming it is clearer.

Then seed the cluster from your machine with that same `MONGODB_URI`:

```bash
npm run seed
```
</details>

### 3. Seed

```bash
npm run seed
# mutual funds .......... 4
# iPhone 17 Pro         9 variants, 7 EMI plans
# ...
# Done. 5 products, 37 variants, 74 images, 35 EMI plans, 4 funds.
```

The seeder is **idempotent and stable**: re-running it reuses the existing `_id` of any variant
or plan it can match by SKU / tenure, so ids already handed out in URLs or written onto an
application keep pointing at the same thing.

### 4. Run

```bash
npm run dev
```

- React app → **http://localhost:5173**
- Express API → **http://localhost:4000/api**

Vite proxies `/api` to Express in development, so the browser only ever calls its own origin
and there is no CORS to configure locally.

Check it end to end:

```bash
curl http://localhost:4000/api/health
# {"success":true,"data":{"status":"ok","database":"connected","databaseName":"onefi",
#   "latencyMs":3,"counts":{"products":5,"variants":37,"emiPlans":35,"funds":4,"applications":0}}}
```

### All scripts

| Command | Does |
|---|---|
| `npm run dev` | Express (watch) + Vite together |
| `npm run dev:server` / `dev:client` | Just one of them |
| `npm run seed` | Seed the catalogue (idempotent) |
| `npm run build` | Production build of the React app into `client/dist` |
| `npm start` | Run the API alone (production) |
| `npm run images:generate` | Regenerate the 28 product SVGs |

---

## Schema

Three collections. Models live in [`server/src/models/`](server/src/models).

```
products                          mutualfunds            emiapplications
├── slug, name, brand, ...        ├── code  ◄──────┐     ├── reference
├── highlights[]      (embedded)  ├── name         │     ├── productId / variantId / emiPlanId
├── variants[]        (embedded)  ├── category     │     └── snapshot of every amount
│   └── images[]      (embedded)  └── expectedReturnBps
└── emiPlans[]        (embedded)
    └── fundCode ───────────────────────────────────┘
```

### What is embedded, and why

**Variants, their images, the spec bullets and the EMI plans are embedded in the product
document.** They are bounded (a phone has a handful of colours and seven tenures), they are
never queried on their own, and they are always needed together — so one `findOne` renders an
entire product page. No joins, no `$lookup`, no N+1. That is the whole reason to reach for a
document database here.

**Mutual funds are a separate collection**, referenced by `fundCode`, because several products
share the same fund and duplicating a return figure into every product would mean updating it
in dozens of places. There are four of them, so the API reads them once and caches them for a
minute rather than joining per request.

**EMI applications are a separate collection** because that one grows without bound. It also
deliberately *snapshots* both the amounts and the product labels, so a later price change or
rename can never rewrite an application somebody already submitted.

### Field notes

| Field | Type | Note |
|---|---|---|
| `products.slug` | String, **unique** | Drives `/products/:slug` |
| `variants[].sku` | String, **unique** (multikey index) | Identifies one variant catalogue-wide |
| `variants[].mrpPaise` / `pricePaise` | Int | Money is **integer paise**, never a float |
| `emiPlans[].interestRateBps` | Int | Rates are **integer basis points**: 1050 = 10.5% |
| `emiPlans[].fundCode` | String | Reference into `mutualfunds.code` |
| `products.isNewArrival` | Boolean | Named this way because Mongoose reserves `doc.isNew` for its own unsaved-document flag — a field called `isNew` reads back as that flag. The API still exposes it as `isNew`. |

Indexes: `slug` (unique), `variants.sku` (unique), `{isActive, position}` for the listing,
`mutualfunds.code` (unique), `emiapplications.reference` (unique) and `{createdAt: -1}`.

### Two decisions worth calling out

**1. Money is integer paise, rates integer basis points.** `pricePaise: 12740000` is ₹1,27,400;
`interestRateBps: 1050` is 10.5%. No float ever touches a monetary value, so no rounding drift
can accumulate. Formatting to `₹1,27,400` happens once, at the API boundary.

**2. `emiPlans` stores terms, never a monthly amount.** The instalment is derived from the price
of the variant being viewed, at request time — which is why a product with 9 variants needs 7
plans and not 63, and why changing a price can never leave a stale EMI figure in the database.

---

## API endpoints and example responses

Base URL: `http://localhost:4000`. Every response uses the same envelope:

```jsonc
{ "success": true,  "data": <payload>, "meta": { ... } }
{ "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "..." } }
```

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api` | Self-describing index of every endpoint |
| `GET` | `/api/health` | Database connectivity + document counts |
| `GET` | `/api/products` | Catalogue listing (`?brand=`, `?search=`) |
| `GET` | `/api/products/:idOrSlug` | One product: variants, images, per-variant EMI plans |
| `GET` | `/api/products/:idOrSlug/emi-plans` | Plans priced against one variant (`?variantId=`) |
| `POST` | `/api/emi-applications` | Submit the selected plan |
| `GET` | `/api/emi-applications/:reference` | Look up a submitted application |

`:idOrSlug` accepts the slug (`iphone-17-pro`) or the Mongo `_id`.
`?variantId=` accepts a variant `_id` or its SKU.

---

### `GET /api/products`

```jsonc
{
  "success": true,
  "data": [
    {
      "id": "6a99b21476af1d40e3d2de65",
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
is the pre-formatted Indian-notation string, so nothing formats money twice.

---

### `GET /api/products/iphone-17-pro`

Abridged to one variant and two plans — the real response carries all 9 variants, each with
all 7 plans priced against its own price.

```jsonc
{
  "success": true,
  "data": {
    "id": "6a99b21476af1d40e3d2de65",
    "slug": "iphone-17-pro",
    "name": "iPhone 17 Pro",
    "brand": "Apple",
    "isNew": true,
    "url": "/products/iphone-17-pro",
    "highlights": [
      { "label": "Display", "value": "6.3\" Super Retina XDR, 120Hz ProMotion" },
      { "label": "Chip",    "value": "A19 Pro, 6-core GPU" }
    ],
    "storageOptions": ["256GB", "512GB", "1TB"],
    "variantCount": 9,
    "defaultVariantId": "6a99b2141712d7820fe03403",
    "variants": [
      {
        "id": "6a99b2141712d7820fe03403",
        "sku": "IPHONE-17-PRO-SILVER-256GB",
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
            "id": "6a99b2141712d7820fe033fc",
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
            "id": "6a99b2141712d7820fe0340a",
            "tenureMonths": 36,
            "interestRate": { "bps": 1050, "percent": 10.5, "display": "10.5%" },
            "isZeroInterest": false,
            "monthlyAmount":  { "paise": 414100,   "rupees": 4141,   "display": "₹4,141" },
            "totalRepayment": { "paise": 14907600, "rupees": 149076, "display": "₹1,49,076" },
            "totalInterest":  { "paise": 2167600,  "rupees": 21676,  "display": "₹21,676" },
            "processingFee":  { "paise": 49900,    "rupees": 499,    "display": "₹499" },
            "cashback":       { "paise": 750000,   "rupees": 7500,   "display": "₹7,500" },
            "totalPayable":   { "paise": 14957500, "rupees": 149575, "display": "₹1,49,575" },
            "effectiveCost":  { "paise": 14207500, "rupees": 142075, "display": "₹1,42,075" },
            "fund": { "code": "BAL-ADV", "name": "1Fi Balanced Advantage Fund", "category": "Hybrid" }
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
curl -X POST http://localhost:4000/api/emi-applications \
  -H "content-type: application/json" \
  -d '{"variantId":"6a99b2141712d7820fe03403","emiPlanId":"6a99b2141712d7820fe033fe"}'
```

`201 Created`:

```jsonc
{
  "success": true,
  "data": {
    "reference": "1FI-93DBHU",
    "status": "PENDING",
    "createdAt": "2026-09-03T18:42:11.072Z",
    "product": { "name": "iPhone 17 Pro", "slug": "iphone-17-pro", "url": "/products/iphone-17-pro" },
    "variant": { "id": "6a99b2141712d7820fe03403", "label": "256GB · Silver", "sku": "IPHONE-17-PRO-SILVER-256GB" },
    "plan": {
      "id": "6a99b2141712d7820fe033fe",
      "tenureMonths": 12,
      "tenureLabel": "12 months",
      "interestRate": { "bps": 0, "percent": 0, "display": "0%" },
      "fundName": "1Fi Short Duration Debt Fund"
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
| 404 | `VARIANT_NOT_FOUND` / `PLAN_NOT_FOUND` | No such document |
| 409 | `VARIANT_OUT_OF_STOCK` | Variant is not sellable |
| 422 | `PLAN_PRODUCT_MISMATCH` | Plan belongs to a different product |

---

### `GET /api/emi-applications/1FI-93DBHU`

Returns the same object, read back from `emiapplications` with the amounts exactly as they were
snapshotted.

---

## How the EMI is calculated

All of it lives in [`server/src/lib/emi.js`](server/src/lib/emi.js).

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
total repayment  = 4141 × 36                = ₹1,49,076
interest         = 149076 − 127400          = ₹21,676
total payable    = 149076 + 499 (fee)       = ₹1,49,575
effective cost   = 149575 − 7500 (cashback) = ₹1,42,075
```

---

## Deploying

Two services, because the API and the React app are separate.

### API (Render, Railway, Fly — anything that runs Node)

- Root directory: `server`
- Build: `npm install`
- Start: `npm start`
- Environment:
  - `MONGODB_URI` — an **Atlas** connection string (a local mongod is not reachable from a host)
  - `CORS_ORIGIN` — the deployed client's URL, e.g. `https://onefi-emi.vercel.app`

Seed the Atlas database once, from your machine, with `MONGODB_URI` pointed at it:

```bash
npm run seed
```

### Client (Vercel, Netlify, Cloudflare Pages)

- Root directory: `client`
- Build: `npm run build` → output `dist`
- Environment: `VITE_API_URL` = the deployed API's URL

It is a single-page app, so the host must rewrite unknown paths to `index.html` or
`/products/iphone-17-pro` would 404 on a hard refresh. Both configs are already in the repo:
[`client/vercel.json`](client/vercel.json) for Vercel, and
[`client/public/_redirects`](client/public/_redirects) for Netlify / Cloudflare Pages.

---

## Project layout

```
├── server/                     Express + Mongoose API
│   ├── src/
│   │   ├── index.js            app bootstrap, CORS, error handling
│   │   ├── db.js               Mongoose connection
│   │   ├── models/             Product, MutualFund, EmiApplication
│   │   ├── routes/             products.js, emiApplications.js
│   │   ├── lib/
│   │   │   ├── emi.js          the instalment maths
│   │   │   ├── money.js        paise/bps helpers + Indian digit grouping
│   │   │   ├── serialize.js    documents -> API JSON
│   │   │   ├── funds.js        cached fund lookup
│   │   │   └── http.js         response envelope
│   │   ├── seed-data.js        the catalogue, in plain rupees
│   │   └── seed.js             idempotent seeder
│   └── .env.example
├── client/                     React + Vite SPA
│   ├── src/
│   │   ├── App.jsx             layout + routes
│   │   ├── api.js              every call to the backend
│   │   ├── hooks/useApi.js     fetch + loading/error, race-safe
│   │   ├── pages/              Home, Products, Product, NotFound
│   │   └── components/         ProductCard, ProductGallery, EmiPlanList, ...
│   ├── public/images/          generated artwork
│   └── vite.config.js          /api proxy to :4000
└── scripts/generate-images.mjs
```

---

## Design notes

**Fetching.** Every request goes through [`client/src/api.js`](client/src/api.js), which unwraps
the `{ success, data }` envelope so components get the payload directly and failures arrive as
thrown `ApiError`s. [`useApi`](client/src/hooks/useApi.js) wraps that in
`{ data, error, loading, reload }` and ignores a response whose dependencies changed mid-flight,
so a slow reply for the previous slug can never overwrite a newer one.

**Variant switching does not hit the network.** `GET /api/products/:slug` returns every variant
with its plans already priced, so changing colour or capacity re-prices the whole ladder from
data already in memory. Plan ids belong to the product, not the variant, so the tenure the
customer picked stays picked. The standalone `/emi-plans` endpoint exists for clients that want
one variant only.

**Prices are formatted once, on the server.** `formatPaise` groups digits the Indian way by hand
rather than through `Intl.NumberFormat`, so output does not depend on the runtime's ICU data.

**Loading states are real.** With data fetched in the browser there is a genuine in-flight
moment on every page, so the skeletons mirror the shape of the content they stand in for and
nothing jumps when the data lands.

**Accessibility.** The plan ladder is a real `radiogroup` with `aria-checked`; colour and
capacity pickers expose `aria-pressed`; the confirmation dialog traps Escape, restores scroll
and takes focus on open; prices use tabular figures so columns do not jitter. Loading states
are announced via `role="status"`, and `prefers-reduced-motion` disables the animations.

**Responsive.** Two columns from `lg` up, one below, verified with no horizontal overflow at
390px.

---

## Attribution

Product names and specifications are used illustratively for this assignment. Artwork is
generated vector art, not photography, and no manufacturer logos are reproduced. Prices are
representative and not real offers.
