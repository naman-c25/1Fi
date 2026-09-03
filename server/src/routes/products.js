import express from "express";
import mongoose from "mongoose";

import { getFundsByCode } from "../lib/funds.js";
import { ApiError, ok } from "../lib/http.js";
import { toProductDTO, toProductSummaryDTO } from "../lib/serialize.js";
import { Product } from "../models/Product.js";

export const productsRouter = express.Router();

/** Escapes a user-supplied string so it is safe inside a RegExp. */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `:idOrSlug` accepts either the URL slug or the Mongo ObjectId. */
function byIdOrSlug(idOrSlug) {
  const or = [{ slug: idOrSlug }];
  if (mongoose.isValidObjectId(idOrSlug)) or.push({ _id: idOrSlug });
  return { isActive: true, $or: or };
}

/**
 * GET /api/products
 *
 * Catalogue listing. Optional filters:
 *   ?brand=Apple      exact brand match, case-insensitive
 *   ?search=pixel     substring of name, brand or tagline
 *
 * The tile only needs a price, a thumbnail and the swatches, so the projection
 * leaves the spec bullets and the extra gallery images in the database.
 */
productsRouter.get("/", async (req, res) => {
  const brand = req.query.brand?.trim();
  const search = req.query.search?.trim();

  const filter = { isActive: true, "variants.0": { $exists: true } };

  if (brand) {
    filter.brand = new RegExp(`^${escapeRegex(brand)}$`, "i");
  }

  if (search) {
    const term = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: term }, { brand: term }, { tagline: term }];
  }

  const products = await Product.find(filter)
    .select("-highlights -description")
    .sort({ position: 1, name: 1 })
    .lean();

  const data = products.map(toProductSummaryDTO);

  return ok(res, data, {
    count: data.length,
    filters: { brand: brand ?? null, search: search ?? null },
  });
});

/**
 * GET /api/products/:idOrSlug
 *
 * One document, one query: the product with every variant, its images, and the
 * EMI plans already priced against each variant.
 */
productsRouter.get("/:idOrSlug", async (req, res) => {
  const product = await Product.findOne(byIdOrSlug(req.params.idOrSlug)).lean();

  if (!product) {
    throw new ApiError("PRODUCT_NOT_FOUND", `No product found for "${req.params.idOrSlug}".`, 404);
  }

  const fundsByCode = await getFundsByCode();
  const data = toProductDTO(product, fundsByCode);

  return ok(res, data, {
    variantCount: data.variantCount,
    emiPlanCount: data.variants[0]?.emiPlans.length ?? 0,
  });
});

/**
 * GET /api/products/:idOrSlug/emi-plans?variantId=...
 *
 * The plans for one product, priced against one variant. `variantId` accepts
 * the variant's id or its SKU; without it the default variant is used.
 */
productsRouter.get("/:idOrSlug/emi-plans", async (req, res) => {
  const product = await Product.findOne(byIdOrSlug(req.params.idOrSlug)).lean();

  if (!product) {
    throw new ApiError("PLANS_NOT_FOUND", `No product found for "${req.params.idOrSlug}".`, 404);
  }

  const fundsByCode = await getFundsByCode();
  const dto = toProductDTO(product, fundsByCode);

  const wanted = req.query.variantId?.trim();
  const variant = wanted
    ? dto.variants.find((v) => v.id === wanted || v.sku === wanted)
    : dto.variants.find((v) => v.id === dto.defaultVariantId);

  if (!variant) {
    throw new ApiError(
      "PLANS_NOT_FOUND",
      `No variant "${wanted}" on product "${req.params.idOrSlug}".`,
      404,
    );
  }

  return ok(
    res,
    {
      product: { id: dto.id, slug: dto.slug, name: dto.name, url: dto.url },
      variant: {
        id: variant.id,
        sku: variant.sku,
        label: variant.label,
        price: variant.price,
        mrp: variant.mrp,
      },
      emiPlans: variant.emiPlans,
    },
    { count: variant.emiPlans.length },
  );
});
