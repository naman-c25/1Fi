import express from "express";

import { computeEmi } from "../lib/emi.js";
import { getFundsByCode } from "../lib/funds.js";
import { ApiError, ok } from "../lib/http.js";
import { toApplicationDTO, variantLabel } from "../lib/serialize.js";
import { EmiApplication } from "../models/EmiApplication.js";
import { Product } from "../models/Product.js";

export const emiApplicationsRouter = express.Router();

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike glyphs

function newReference() {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `1FI-${suffix}`;
}

/**
 * POST /api/emi-applications
 *
 * Backs the "Proceed" button. The instalment is recomputed here from the
 * stored variant price and plan terms — whatever the client displayed is never
 * trusted — and the result is snapshotted onto the application.
 *
 * Body: { "variantId": "...", "emiPlanId": "..." }
 */
emiApplicationsRouter.post("/", async (req, res) => {
  const variantId = typeof req.body?.variantId === "string" ? req.body.variantId.trim() : "";
  const emiPlanId = typeof req.body?.emiPlanId === "string" ? req.body.emiPlanId.trim() : "";

  if (!variantId || !emiPlanId) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Both `variantId` and `emiPlanId` are required strings.",
      422,
    );
  }

  // One query finds the product, the variant and the plan, because all three
  // live in the same document.
  const product = await Product.findOne({
    isActive: true,
    $or: [{ "variants._id": variantId }, { "variants.sku": variantId }],
  }).lean();

  if (!product) {
    throw new ApiError("VARIANT_NOT_FOUND", `No variant matches "${variantId}".`, 404);
  }

  const variant = product.variants.find(
    (v) => v._id.toString() === variantId || v.sku === variantId,
  );

  if (!variant) {
    throw new ApiError("VARIANT_NOT_FOUND", `No variant matches "${variantId}".`, 404);
  }
  if (!variant.inStock) {
    throw new ApiError("VARIANT_OUT_OF_STOCK", `${variant.sku} is out of stock.`, 409);
  }

  const plan = product.emiPlans.find((p) => p._id.toString() === emiPlanId && p.isActive);

  if (!plan) {
    // The plan may exist, but on a different product — say so precisely.
    const existsElsewhere = await Product.exists({ "emiPlans._id": emiPlanId });
    if (existsElsewhere) {
      throw new ApiError(
        "PLAN_PRODUCT_MISMATCH",
        "That EMI plan does not belong to the selected product.",
        422,
      );
    }
    throw new ApiError("PLAN_NOT_FOUND", `No active EMI plan matches "${emiPlanId}".`, 404);
  }

  const breakdown = computeEmi({
    principalPaise: variant.pricePaise,
    tenureMonths: plan.tenureMonths,
    interestRateBps: plan.interestRateBps,
    cashbackPaise: plan.cashbackPaise,
    processingFeePaise: plan.processingFeePaise,
  });

  const fundsByCode = await getFundsByCode();

  const application = await EmiApplication.create({
    reference: newReference(),
    productId: product._id,
    variantId: variant._id,
    emiPlanId: plan._id,
    productName: product.name,
    productSlug: product.slug,
    variantLabel: variantLabel(variant),
    variantSku: variant.sku,
    fundName: fundsByCode.get(plan.fundCode)?.name ?? null,
    principalPaise: breakdown.principalPaise,
    monthlyAmountPaise: breakdown.monthlyAmountPaise,
    totalPayablePaise: breakdown.totalPayablePaise,
    cashbackPaise: breakdown.cashbackPaise,
    tenureMonths: breakdown.tenureMonths,
    interestRateBps: breakdown.interestRateBps,
  });

  return ok(res, toApplicationDTO(application), undefined, 201);
});

/**
 * GET /api/emi-applications/:reference
 *
 * Reads one back by its printed reference (e.g. 1FI-8KQ2M4), with the amounts
 * exactly as they were snapshotted.
 */
emiApplicationsRouter.get("/:reference", async (req, res) => {
  const application = await EmiApplication.findOne({
    reference: req.params.reference.toUpperCase(),
  });

  if (!application) {
    throw new ApiError(
      "APPLICATION_NOT_FOUND",
      `No application found for "${req.params.reference}".`,
      404,
    );
  }

  return ok(res, toApplicationDTO(application));
});
