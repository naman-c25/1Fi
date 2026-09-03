import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Created when a customer taps "Proceed" on a selected plan.
 *
 * Its own collection because it grows without bound, and it deliberately
 * *snapshots* both the derived amounts and the product labels: a later price
 * change or rename must never rewrite an application somebody already
 * submitted, and reading one back should not need a join.
 */
const emiApplicationSchema = new Schema(
  {
    /** Human-facing reference shown on the confirmation screen, e.g. "1FI-8KQ2M4". */
    reference: { type: String, required: true, unique: true },

    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    emiPlanId: { type: Schema.Types.ObjectId, required: true },

    // Snapshot of what was bought.
    productName: { type: String, required: true },
    productSlug: { type: String, required: true },
    variantLabel: { type: String, required: true },
    variantSku: { type: String, required: true },
    fundName: { type: String, default: null },

    // Snapshot of the numbers, in paise / bps.
    principalPaise: { type: Number, required: true },
    monthlyAmountPaise: { type: Number, required: true },
    totalPayablePaise: { type: Number, required: true },
    cashbackPaise: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    interestRateBps: { type: Number, required: true },

    status: { type: String, default: "PENDING" },
  },
  { timestamps: true },
);

emiApplicationSchema.index({ createdAt: -1 });

export const EmiApplication = mongoose.model("EmiApplication", emiApplicationSchema);
