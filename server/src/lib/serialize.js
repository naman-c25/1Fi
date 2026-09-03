/**
 * Turns MongoDB documents into the JSON the client consumes.
 *
 * This is the only layer that knows about paise and basis points — everything
 * downstream reads `.display` strings that were formatted once, here.
 */

import { computeEmi, monthlyInstalmentPaise, pledgedUnitsPaise, tenureLabel } from "./emi.js";
import { discountPercent, money, rate } from "./money.js";

export function toFundDTO(fund) {
  if (!fund) return null;
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
 * Prices a stored plan against one variant. This is the single place a monthly
 * instalment comes into existence — the database never holds one.
 */
export function toEmiPlanDTO(plan, pricePaise, fund) {
  const breakdown = computeEmi({
    principalPaise: pricePaise,
    tenureMonths: plan.tenureMonths,
    interestRateBps: plan.interestRateBps,
    cashbackPaise: plan.cashbackPaise,
    processingFeePaise: plan.processingFeePaise,
  });

  return {
    id: plan._id.toString(),
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
    fund: toFundDTO(fund),
  };
}

export function variantLabel(variant) {
  return `${variant.storage} · ${variant.colorName}`;
}

export function toVariantDTO(variant, plans, fundsByCode) {
  const emiPlans = plans.map((plan) =>
    toEmiPlanDTO(plan, variant.pricePaise, fundsByCode.get(plan.fundCode)),
  );

  const lowest = emiPlans.reduce(
    (min, plan) => Math.min(min, plan.monthlyAmount.paise),
    Number.POSITIVE_INFINITY,
  );

  return {
    id: variant._id.toString(),
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
    images: [...variant.images]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({
        url: image.url,
        alt: image.alt ?? `${variant.colorName} ${variant.storage}`,
      })),
    emiPlans,
    lowestMonthlyAmount: money(Number.isFinite(lowest) ? lowest : 0),
  };
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function sortByPosition(items) {
  return [...items].sort((a, b) => a.position - b.position);
}

function activePlans(product) {
  return sortByPosition(product.emiPlans.filter((plan) => plan.isActive));
}

/** Everything the product page needs, in one object. */
export function toProductDTO(product, fundsByCode) {
  const plans = activePlans(product);
  const variants = sortByPosition(product.variants).map((variant) =>
    toVariantDTO(variant, plans, fundsByCode),
  );
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0];

  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    tagline: product.tagline,
    description: product.description,
    isNew: product.isNewArrival,
    url: `/products/${product.slug}`,
    highlights: sortByPosition(product.highlights).map((h) => ({
      label: h.label,
      value: h.value,
    })),
    colors: uniqueBy(
      variants.map((v) => ({ name: v.colorName, hex: v.colorHex })),
      (c) => c.name,
    ),
    storageOptions: [...new Set(variants.map((v) => v.storage))],
    variantCount: variants.length,
    defaultVariantId: defaultVariant ? defaultVariant.id : "",
    variants,
  };
}

/**
 * The catalogue tile. Built straight off the document rather than by trimming
 * a full product DTO, so it never computes 63 plan breakdowns to print one
 * "EMI from" figure.
 */
export function toProductSummaryDTO(product) {
  const variants = sortByPosition(product.variants);
  const plans = activePlans(product);

  const cheapest = variants.reduce((best, v) => (v.pricePaise < best.pricePaise ? v : best));
  const hero = variants.find((v) => v.isDefault) ?? cheapest;
  const heroImage = [...hero.images].sort((a, b) => a.position - b.position)[0];

  let lowestMonthly = Number.POSITIVE_INFINITY;
  for (const variant of variants) {
    for (const plan of plans) {
      const monthly = monthlyInstalmentPaise(
        variant.pricePaise,
        plan.tenureMonths,
        plan.interestRateBps,
      );
      if (monthly < lowestMonthly) lowestMonthly = monthly;
    }
  }

  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    tagline: product.tagline,
    isNew: product.isNewArrival,
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
    longestTenureMonths: plans.reduce((max, plan) => Math.max(max, plan.tenureMonths), 0),
    emiPlanCount: plans.length,
  };
}

export function toApplicationDTO(application) {
  return {
    reference: application.reference,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
    product: {
      name: application.productName,
      slug: application.productSlug,
      url: `/products/${application.productSlug}`,
    },
    variant: {
      id: application.variantId.toString(),
      label: application.variantLabel,
      sku: application.variantSku,
    },
    plan: {
      id: application.emiPlanId.toString(),
      tenureMonths: application.tenureMonths,
      tenureLabel: tenureLabel(application.tenureMonths),
      interestRate: rate(application.interestRateBps),
      fundName: application.fundName,
    },
    principal: money(application.principalPaise),
    monthlyAmount: money(application.monthlyAmountPaise),
    totalPayable: money(application.totalPayablePaise),
    cashback: money(application.cashbackPaise),
  };
}
