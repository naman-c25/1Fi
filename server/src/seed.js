/**
 * Seeds the catalogue into MongoDB.
 *
 * Idempotent, and stable: re-running it reuses the existing `_id` of any
 * variant or plan it can match (by SKU / tenure), so ids that have already been
 * handed out in URLs or written onto an EmiApplication keep pointing at the
 * same thing.
 *
 *   npm run seed          (from the repo root)
 *   npm run seed -w server
 */

import "dotenv/config";

import { connectToDatabase, disconnectFromDatabase } from "./db.js";
import { clearFundCache } from "./lib/funds.js";
import { EmiApplication } from "./models/EmiApplication.js";
import { MutualFund } from "./models/MutualFund.js";
import { Product } from "./models/Product.js";
import { FUNDS, PRODUCTS, colorSlug, imagePath, storageSlug } from "./seed-data.js";

/** Prices live in the seed file as rupees; the database stores paise. */
const toPaise = (rupees) => Math.round(rupees * 100);

/** "iphone-17-pro" + "Silver" + "256GB" -> "IPHONE-17-PRO-SILVER-256GB" */
function skuFor(product, colorName, storageLabel) {
  return [product.slug, colorSlug(colorName), storageSlug(storageLabel)].join("-").toUpperCase();
}

/**
 * Builds the embedded variant array: the cross product of colour x capacity.
 * Every colour is offered in every capacity, priced by capacity.
 */
function buildVariants(product, existing) {
  const bySku = new Map((existing?.variants ?? []).map((v) => [v.sku, v]));
  const variants = [];
  let position = 0;

  for (const color of product.colors) {
    for (const storage of product.storages) {
      const sku = skuFor(product, color.name, storage.label);
      const previous = bySku.get(sku);

      variants.push({
        // Reuse the id if this variant already exists, so links and
        // applications that reference it stay valid across a reseed.
        ...(previous ? { _id: previous._id } : {}),
        slug: `${colorSlug(color.name)}-${storageSlug(storage.label)}`,
        sku,
        colorName: color.name,
        colorHex: color.hex,
        storage: storage.label,
        mrpPaise: toPaise(storage.mrp),
        pricePaise: toPaise(storage.price),
        inStock: true,
        isDefault: Boolean(storage.isDefault) && color === product.colors[0],
        position: position++,
        images: [
          {
            url: imagePath(product.slug, color.name, "back"),
            alt: `${product.name} in ${color.name}, rear view`,
            position: 0,
          },
          {
            url: imagePath(product.slug, color.name, "front"),
            alt: `${product.name} in ${color.name}, front view`,
            position: 1,
          },
        ],
      });
    }
  }

  return variants;
}

function buildPlans(product, existing) {
  const byTenure = new Map((existing?.emiPlans ?? []).map((p) => [p.tenureMonths, p]));

  return product.plans.map((plan, index) => {
    const previous = byTenure.get(plan.tenureMonths);
    return {
      ...(previous ? { _id: previous._id } : {}),
      tenureMonths: plan.tenureMonths,
      interestRateBps: plan.interestRateBps,
      cashbackPaise: toPaise(plan.cashback),
      processingFeePaise: toPaise(plan.processingFee),
      fundCode: plan.fundCode,
      isRecommended: Boolean(plan.isRecommended),
      isActive: true,
      position: index,
    };
  });
}

async function seedFunds() {
  for (const fund of FUNDS) {
    await MutualFund.findOneAndUpdate({ code: fund.code }, { $set: fund }, { upsert: true });
  }
  clearFundCache();
  console.log(`  mutual funds .......... ${FUNDS.length}`);
}

async function seedProducts() {
  for (const [index, product] of PRODUCTS.entries()) {
    const existing = await Product.findOne({ slug: product.slug }).lean();

    const document = {
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      category: "Smartphones",
      tagline: product.tagline,
      description: product.description,
      isNewArrival: product.isNew,
      position: index,
      isActive: true,
      highlights: product.highlights.map((highlight, i) => ({ ...highlight, position: i })),
      variants: buildVariants(product, existing),
      emiPlans: buildPlans(product, existing),
    };

    await Product.findOneAndUpdate(
      { slug: product.slug },
      { $set: document },
      { upsert: true, new: true },
    );

    console.log(
      `  ${product.name.padEnd(20)} ${String(document.variants.length).padStart(2)} variants, ` +
        `${document.emiPlans.length} EMI plans`,
    );
  }
}

async function main() {
  const connection = await connectToDatabase(process.env.MONGODB_URI);
  console.log(`Seeding ${connection.name} at ${connection.host}\n`);

  await seedFunds();
  console.log("");
  await seedProducts();

  // Indexes are declared on the schemas; build them now rather than lazily on
  // the first query.
  await Promise.all([
    Product.syncIndexes(),
    MutualFund.syncIndexes(),
    EmiApplication.syncIndexes(),
  ]);

  const [products, funds, agg] = await Promise.all([
    Product.countDocuments(),
    MutualFund.countDocuments(),
    Product.aggregate([
      {
        $group: {
          _id: null,
          variants: { $sum: { $size: "$variants" } },
          plans: { $sum: { $size: "$emiPlans" } },
          images: { $sum: { $sum: { $map: { input: "$variants", in: { $size: "$$this.images" } } } } },
        },
      },
    ]),
  ]);

  const totals = agg[0] ?? { variants: 0, plans: 0, images: 0 };
  console.log(
    `\nDone. ${products} products, ${totals.variants} variants, ${totals.images} images, ` +
      `${totals.plans} EMI plans, ${funds} funds.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(disconnectFromDatabase);
