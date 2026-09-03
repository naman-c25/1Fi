import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Document design
 * ---------------
 * Variants, their images, the spec bullets and the EMI plan ladder are all
 * *embedded* in the product document. They are bounded (a phone has a handful
 * of colours and seven tenures), they are never queried on their own, and they
 * are always needed together — which makes one `findOne` enough to render an
 * entire product page. That is the whole reason to reach for MongoDB here.
 *
 * What is NOT embedded:
 *   - mutual funds, because several products share the same fund (referenced
 *     by `fundCode`)
 *   - EMI applications, because that collection grows without bound
 */

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: null },
    position: { type: Number, default: 0 },
  },
  { _id: false },
);

const highlightSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    position: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * A concrete purchasable configuration: colour + capacity, with its own price.
 * Keeps its `_id` — that id is the `variantId` the client posts back when the
 * customer proceeds with a plan.
 */
const variantSchema = new Schema({
  slug: { type: String, required: true },
  sku: { type: String, required: true },

  colorName: { type: String, required: true },
  colorHex: { type: String, required: true },
  storage: { type: String, required: true },

  /** Maximum retail price, in paise. Shown struck through. */
  mrpPaise: { type: Number, required: true, min: 0 },
  /** Actual selling price, in paise. Every EMI is computed against this. */
  pricePaise: { type: Number, required: true, min: 0 },

  inStock: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  position: { type: Number, default: 0 },

  images: { type: [imageSchema], default: [] },
});

/**
 * A financing option. Stores only the *terms* — the monthly instalment is
 * derived from the selected variant's price at request time, never stored.
 * Keeps its `_id` as the `emiPlanId`.
 */
const emiPlanSchema = new Schema({
  /** Number of monthly instalments (3, 6, 12, 24, 36, 48, 60). */
  tenureMonths: { type: Number, required: true, min: 1 },
  /** Annual interest rate in basis points. 0 = "0% interest", 1050 = 10.5%. */
  interestRateBps: { type: Number, default: 0, min: 0 },
  /** Flat cashback credited back to the customer, in paise. */
  cashbackPaise: { type: Number, default: 0, min: 0 },
  /** One-time processing fee, in paise. */
  processingFeePaise: { type: Number, default: 0, min: 0 },

  /** Points at a document in the `mutualfunds` collection. */
  fundCode: { type: String, required: true },

  isRecommended: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  position: { type: Number, default: 0 },
});

const productSchema = new Schema(
  {
    /** URL segment — the public identifier, e.g. "iphone-17-pro". */
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, default: "Smartphones" },
    tagline: { type: String, default: null },
    description: { type: String, default: null },
    /**
     * Renders the "NEW" ribbon. Named `isNewArrival` and not `isNew` because
     * Mongoose reserves `doc.isNew` for its own "unsaved document" flag — a
     * field by that name reads back as the flag, not the value. The API still
     * exposes it as `isNew`; the rename stops at the serializer.
     */
    isNewArrival: { type: Boolean, default: false },
    /** Ordering hint for the catalogue grid (lower = earlier). */
    position: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    highlights: { type: [highlightSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    emiPlans: { type: [emiPlanSchema], default: [] },
  },
  { timestamps: true },
);

// Catalogue listing: filter on isActive, sort by position.
productSchema.index({ isActive: 1, position: 1 });
// A SKU identifies exactly one variant across the whole catalogue.
productSchema.index({ "variants.sku": 1 }, { unique: true, sparse: true });

export const Product = mongoose.model("Product", productSchema);
