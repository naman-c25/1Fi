/**
 * Seeds the catalogue.
 *
 * Idempotent: every write is an upsert keyed on a natural unique column
 * (slug / sku / code), so `npm run db:seed` can be run repeatedly against the
 * same database without duplicating rows.
 *
 *   npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

import {
  FUNDS,
  PRODUCTS,
  colorSlug,
  imagePath,
  storageSlug,
  type SeedProduct,
} from "./seed-data";

const prisma = new PrismaClient();

/** Prices live in the seed file as rupees; the database stores paise. */
const toPaise = (rupees: number) => Math.round(rupees * 100);

/** "iphone-17-pro" + "silver" + "256GB" -> "IPHONE-17-PRO-SILVER-256GB" */
function skuFor(product: SeedProduct, colorName: string, storageLabel: string): string {
  return [product.slug, colorSlug(colorName), storageSlug(storageLabel)]
    .join("-")
    .toUpperCase();
}

async function seedFunds() {
  for (const fund of FUNDS) {
    await prisma.mutualFund.upsert({
      where: { code: fund.code },
      create: fund,
      update: fund,
    });
  }
  console.log(`  mutual funds .......... ${FUNDS.length}`);
}

async function seedProduct(product: SeedProduct, position: number) {
  const record = await prisma.product.upsert({
    where: { slug: product.slug },
    create: {
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      tagline: product.tagline,
      description: product.description,
      isNew: product.isNew,
      position,
    },
    update: {
      name: product.name,
      brand: product.brand,
      tagline: product.tagline,
      description: product.description,
      isNew: product.isNew,
      position,
      isActive: true,
    },
  });

  // Highlights have no natural key, so they are replaced wholesale.
  await prisma.productHighlight.deleteMany({ where: { productId: record.id } });
  await prisma.productHighlight.createMany({
    data: product.highlights.map((highlight, index) => ({
      productId: record.id,
      label: highlight.label,
      value: highlight.value,
      position: index,
    })),
  });

  // Variants are the cross product of colour x storage: every colour is
  // offered in every capacity, priced by capacity.
  let variantCount = 0;
  let position2 = 0;

  for (const color of product.colors) {
    for (const storage of product.storages) {
      const slug = `${colorSlug(color.name)}-${storageSlug(storage.label)}`;
      const sku = skuFor(product, color.name, storage.label);
      const isDefault = Boolean(storage.isDefault) && color === product.colors[0];

      const variantData = {
        colorName: color.name,
        colorHex: color.hex,
        storage: storage.label,
        mrpPaise: toPaise(storage.mrp),
        pricePaise: toPaise(storage.price),
        isDefault,
        position: position2,
      };

      const variant = await prisma.variant.upsert({
        where: { productId_slug: { productId: record.id, slug } },
        create: { productId: record.id, slug, sku, ...variantData },
        update: { sku, ...variantData },
      });

      await prisma.variantImage.deleteMany({ where: { variantId: variant.id } });
      await prisma.variantImage.createMany({
        data: [
          {
            variantId: variant.id,
            url: imagePath(product.slug, color.name, "back"),
            alt: `${product.name} in ${color.name}, rear view`,
            position: 0,
          },
          {
            variantId: variant.id,
            url: imagePath(product.slug, color.name, "front"),
            alt: `${product.name} in ${color.name}, front view`,
            position: 1,
          },
        ],
      });

      variantCount += 1;
      position2 += 1;
    }
  }

  for (const [index, plan] of product.plans.entries()) {
    const fund = await prisma.mutualFund.findUniqueOrThrow({ where: { code: plan.fundCode } });

    const planData = {
      fundId: fund.id,
      interestRateBps: plan.interestRateBps,
      cashbackPaise: toPaise(plan.cashback),
      processingFeePaise: toPaise(plan.processingFee),
      isRecommended: Boolean(plan.isRecommended),
      isActive: true,
      position: index,
    };

    await prisma.emiPlan.upsert({
      where: {
        productId_tenureMonths: { productId: record.id, tenureMonths: plan.tenureMonths },
      },
      create: { productId: record.id, tenureMonths: plan.tenureMonths, ...planData },
      update: planData,
    });
  }

  console.log(
    `  ${product.name.padEnd(20)} ${String(variantCount).padStart(2)} variants, ` +
      `${product.plans.length} EMI plans`,
  );
}

async function main() {
  console.log("Seeding 1Fi catalogue...\n");

  await seedFunds();
  console.log("");

  for (const [index, product] of PRODUCTS.entries()) {
    await seedProduct(product, index);
  }

  const [products, variants, images, plans] = await Promise.all([
    prisma.product.count(),
    prisma.variant.count(),
    prisma.variantImage.count(),
    prisma.emiPlan.count(),
  ]);

  console.log(
    `\nDone. ${products} products, ${variants} variants, ${images} images, ${plans} EMI plans.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
