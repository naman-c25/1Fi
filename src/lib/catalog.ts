import "server-only";

import { Prisma } from "@prisma/client";

import { computeEmi, monthlyInstalmentPaise, pledgedUnitsPaise, tenureLabel } from "./emi";
import {
  BPS_PER_PERCENT,
  discountPercent,
  formatBps,
  formatPaise,
  paiseToRupees,
} from "./money";
import { prisma } from "./prisma";
import type {
  EmiApplicationDTO,
  EmiPlanDTO,
  FundDTO,
  Money,
  ProductDTO,
  ProductSummaryDTO,
  Rate,
  VariantDTO,
} from "./types";

// ---------------------------------------------------------------------------
// Primitive mappers
// ---------------------------------------------------------------------------

export function money(paise: number): Money {
  return { paise, rupees: paiseToRupees(paise), display: formatPaise(paise) };
}

export function rate(bps: number): Rate {
  return { bps, percent: bps / BPS_PER_PERCENT, display: formatBps(bps) };
}

// ---------------------------------------------------------------------------
// Query shapes
// ---------------------------------------------------------------------------

const productInclude = {
  highlights: { orderBy: { position: "asc" } },
  variants: {
    orderBy: [{ position: "asc" }, { slug: "asc" }],
    include: { images: { orderBy: { position: "asc" } } },
  },
  emiPlans: {
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { tenureMonths: "asc" }],
    include: { fund: true },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type PlanWithFund = ProductWithRelations["emiPlans"][number];
type VariantWithImages = ProductWithRelations["variants"][number];

/**
 * The catalogue tile needs far less than the product page: no spec bullets, no
 * fund details, and only the one image it actually shows. Fetching the full
 * tree for every product just to throw most of it away is the difference
 * between ~250 rows and ~50 on the listing.
 */
const summaryInclude = {
  variants: {
    orderBy: [{ position: "asc" }, { slug: "asc" }],
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  },
  emiPlans: {
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { tenureMonths: "asc" }],
  },
} satisfies Prisma.ProductInclude;

type ProductSummaryRow = Prisma.ProductGetPayload<{ include: typeof summaryInclude }>;

/**
 * Fetch every relation in one statement (LATERAL joins) instead of one round
 * trip per relation. Irrelevant against a local database; decisive when the
 * database is a few hundred milliseconds away.
 */
const JOIN = { relationLoadStrategy: "join" } as const;

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

function toFundDTO(fund: PlanWithFund["fund"]): FundDTO {
  return {
    code: fund.code,
    name: fund.name,
    amc: fund.amc,
    category: fund.category,
    expectedReturn: rate(fund.expectedReturnBps),
    riskLevel: fund.riskLevel,
  };
}

/**
 * Prices a stored plan against a specific variant. This is the one place where
 * a monthly instalment comes into existence - the database never stores one.
 */
function toEmiPlanDTO(plan: PlanWithFund, pricePaise: number): EmiPlanDTO {
  const breakdown = computeEmi({
    principalPaise: pricePaise,
    tenureMonths: plan.tenureMonths,
    interestRateBps: plan.interestRateBps,
    cashbackPaise: plan.cashbackPaise,
    processingFeePaise: plan.processingFeePaise,
  });

  return {
    id: plan.id,
    tenureMonths: plan.tenureMonths,
    tenureLabel: tenureLabel(plan.tenureMonths),
    interestRate: rate(plan.interestRateBps),
    isZeroInterest: plan.interestRateBps === 0,
    isRecommended: plan.isRecommended,
    monthlyAmount: money(breakdown.monthlyAmountPaise),
    finalInstalment: money(breakdown.finalInstalmentPaise),
    totalRepayment: money(breakdown.totalRepaymentPaise),
    totalInterest: money(breakdown.totalInterestPaise),
    processingFee: money(breakdown.processingFeePaise),
    cashback: money(breakdown.cashbackPaise),
    totalPayable: money(breakdown.totalPayablePaise),
    effectiveCost: money(breakdown.effectiveCostPaise),
    pledgedAmount: money(pledgedUnitsPaise(pricePaise)),
    fund: toFundDTO(plan.fund),
  };
}

function variantLabel(variant: { storage: string; colorName: string }): string {
  return `${variant.storage} · ${variant.colorName}`;
}

function toVariantDTO(variant: VariantWithImages, plans: PlanWithFund[]): VariantDTO {
  const emiPlans = plans.map((plan) => toEmiPlanDTO(plan, variant.pricePaise));
  const lowest = emiPlans.reduce<number>(
    (min, plan) => Math.min(min, plan.monthlyAmount.paise),
    Number.POSITIVE_INFINITY,
  );

  return {
    id: variant.id,
    sku: variant.sku,
    slug: variant.slug,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    storage: variant.storage,
    label: variantLabel(variant),
    mrp: money(variant.mrpPaise),
    price: money(variant.pricePaise),
    savings: money(Math.max(0, variant.mrpPaise - variant.pricePaise)),
    discountPercent: discountPercent(variant.mrpPaise, variant.pricePaise),
    inStock: variant.inStock,
    isDefault: variant.isDefault,
    images: variant.images.map((image) => ({
      url: image.url,
      alt: image.alt ?? `${variant.colorName} ${variant.storage}`,
    })),
    emiPlans,
    lowestMonthlyAmount: money(Number.isFinite(lowest) ? lowest : 0),
  };
}

function uniqueBy<T, K>(items: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function toProductDTO(product: ProductWithRelations): ProductDTO {
  const variants = product.variants.map((variant) => toVariantDTO(variant, product.emiPlans));
  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    tagline: product.tagline,
    description: product.description,
    isNew: product.isNew,
    url: `/products/${product.slug}`,
    highlights: product.highlights.map((h) => ({ label: h.label, value: h.value })),
    colors: uniqueBy(
      variants.map((v) => ({ name: v.colorName, hex: v.colorHex })),
      (c) => c.name,
    ),
    storageOptions: [...new Set(variants.map((v) => v.storage))],
    variantCount: variants.length,
    defaultVariantId: defaultVariant?.id ?? "",
    variants,
  };
}

function toProductSummaryDTO(product: ProductSummaryRow): ProductSummaryDTO {
  const variants = product.variants;
  const cheapest = variants.reduce((best, v) => (v.pricePaise < best.pricePaise ? v : best));
  const hero = variants.find((v) => v.isDefault) ?? cheapest;
  const heroImage = hero.images[0];

  // "EMI from ₹X" — the smallest instalment across every variant and tenure.
  // Only the instalment is needed here, not the full breakdown.
  let lowestMonthly = Number.POSITIVE_INFINITY;
  for (const variant of variants) {
    for (const plan of product.emiPlans) {
      const monthly = monthlyInstalmentPaise(
        variant.pricePaise,
        plan.tenureMonths,
        plan.interestRateBps,
      );
      if (monthly < lowestMonthly) lowestMonthly = monthly;
    }
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    tagline: product.tagline,
    isNew: product.isNew,
    url: `/products/${product.slug}`,
    image: heroImage
      ? { url: heroImage.url, alt: heroImage.alt ?? `${hero.colorName} ${hero.storage}` }
      : null,
    colors: uniqueBy(
      variants.map((v) => ({ name: v.colorName, hex: v.colorHex })),
      (c) => c.name,
    ),
    storageOptions: [...new Set(variants.map((v) => v.storage))],
    variantCount: variants.length,
    startingPrice: money(cheapest.pricePaise),
    startingMrp: money(cheapest.mrpPaise),
    discountPercent: discountPercent(cheapest.mrpPaise, cheapest.pricePaise),
    lowestMonthlyAmount: money(Number.isFinite(lowestMonthly) ? lowestMonthly : 0),
    longestTenureMonths: product.emiPlans.reduce(
      (max, plan) => Math.max(max, plan.tenureMonths),
      0,
    ),
    emiPlanCount: product.emiPlans.length,
  };
}

// ---------------------------------------------------------------------------
// Public data-access API
// ---------------------------------------------------------------------------

export async function listProducts(options: { brand?: string; search?: string } = {}) {
  const products = await prisma.product.findMany({
    ...JOIN,
    where: {
      isActive: true,
      // A product with no variants has no price and nothing to buy.
      variants: { some: {} },
      ...(options.brand ? { brand: { equals: options.brand, mode: "insensitive" } } : {}),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: "insensitive" } },
              { brand: { contains: options.search, mode: "insensitive" } },
              { tagline: { contains: options.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: summaryInclude,
  });

  return products.map(toProductSummaryDTO);
}

/** Accepts either the cuid primary key or the URL slug. */
export async function getProduct(idOrSlug: string): Promise<ProductDTO | null> {
  const product = await prisma.product.findFirst({
    ...JOIN,
    where: { isActive: true, OR: [{ slug: idOrSlug }, { id: idOrSlug }] },
    include: productInclude,
  });

  return product ? toProductDTO(product) : null;
}

export async function listProductSlugs(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
    orderBy: { position: "asc" },
  });
  return rows.map((row) => row.slug);
}

/**
 * Plans for one product, priced against a chosen variant. Falls back to the
 * default variant when none is supplied.
 */
export async function getEmiPlans(idOrSlug: string, variantIdOrSku?: string) {
  const product = await getProduct(idOrSlug);
  if (!product) return null;

  const variant = variantIdOrSku
    ? product.variants.find((v) => v.id === variantIdOrSku || v.sku === variantIdOrSku)
    : product.variants.find((v) => v.id === product.defaultVariantId);

  if (!variant) return null;

  return {
    product: { id: product.id, slug: product.slug, name: product.name, url: product.url },
    variant: {
      id: variant.id,
      sku: variant.sku,
      label: variant.label,
      price: variant.price,
      mrp: variant.mrp,
    },
    emiPlans: variant.emiPlans,
  };
}

// ---------------------------------------------------------------------------
// Applications ("Proceed with this plan")
// ---------------------------------------------------------------------------

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike glyphs

function newReference(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `1FI-${suffix}`;
}

export class CatalogError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

export async function createEmiApplication(input: {
  variantId: string;
  emiPlanId: string;
}): Promise<EmiApplicationDTO> {
  const variant = await prisma.variant.findFirst({
    ...JOIN,
    where: { OR: [{ id: input.variantId }, { sku: input.variantId }] },
    include: { product: true },
  });

  if (!variant) {
    throw new CatalogError("VARIANT_NOT_FOUND", `No variant matches "${input.variantId}".`, 404);
  }
  if (!variant.inStock) {
    throw new CatalogError("VARIANT_OUT_OF_STOCK", `${variant.sku} is out of stock.`, 409);
  }

  const plan = await prisma.emiPlan.findFirst({
    ...JOIN,
    where: { id: input.emiPlanId, isActive: true },
    include: { fund: true },
  });

  if (!plan) {
    throw new CatalogError(
      "PLAN_NOT_FOUND",
      `No active EMI plan matches "${input.emiPlanId}".`,
      404,
    );
  }
  if (plan.productId !== variant.productId) {
    throw new CatalogError(
      "PLAN_PRODUCT_MISMATCH",
      "That EMI plan does not belong to the selected product.",
      422,
    );
  }

  const breakdown = computeEmi({
    principalPaise: variant.pricePaise,
    tenureMonths: plan.tenureMonths,
    interestRateBps: plan.interestRateBps,
    cashbackPaise: plan.cashbackPaise,
    processingFeePaise: plan.processingFeePaise,
  });

  // Snapshot the derived amounts so a later price change never rewrites an
  // application that has already been submitted.
  const application = await prisma.emiApplication.create({
    data: {
      reference: newReference(),
      variantId: variant.id,
      emiPlanId: plan.id,
      principalPaise: breakdown.principalPaise,
      monthlyAmountPaise: breakdown.monthlyAmountPaise,
      totalPayablePaise: breakdown.totalPayablePaise,
      cashbackPaise: breakdown.cashbackPaise,
      tenureMonths: breakdown.tenureMonths,
      interestRateBps: breakdown.interestRateBps,
    },
  });

  return {
    reference: application.reference,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
    product: {
      name: variant.product.name,
      slug: variant.product.slug,
      url: `/products/${variant.product.slug}`,
    },
    variant: {
      id: variant.id,
      label: variantLabel(variant),
      sku: variant.sku,
    },
    plan: {
      id: plan.id,
      tenureMonths: plan.tenureMonths,
      tenureLabel: tenureLabel(plan.tenureMonths),
      interestRate: rate(plan.interestRateBps),
    },
    principal: money(application.principalPaise),
    monthlyAmount: money(application.monthlyAmountPaise),
    totalPayable: money(application.totalPayablePaise),
    cashback: money(application.cashbackPaise),
  };
}

/** Reads back a submitted application from its printed reference. */
export async function getEmiApplication(reference: string): Promise<EmiApplicationDTO | null> {
  const application = await prisma.emiApplication.findUnique({
    ...JOIN,
    where: { reference },
    include: {
      emiPlan: true,
      variant: { include: { product: true } },
    },
  });

  if (!application) return null;

  return {
    reference: application.reference,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
    product: {
      name: application.variant.product.name,
      slug: application.variant.product.slug,
      url: `/products/${application.variant.product.slug}`,
    },
    variant: {
      id: application.variant.id,
      label: variantLabel(application.variant),
      sku: application.variant.sku,
    },
    plan: {
      id: application.emiPlan.id,
      tenureMonths: application.tenureMonths,
      tenureLabel: tenureLabel(application.tenureMonths),
      interestRate: rate(application.interestRateBps),
    },
    principal: money(application.principalPaise),
    monthlyAmount: money(application.monthlyAmountPaise),
    totalPayable: money(application.totalPayablePaise),
    cashback: money(application.cashbackPaise),
  };
}
