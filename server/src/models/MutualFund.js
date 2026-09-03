import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * The fund an EMI plan is collateralised against. 1Fi lends against holdings
 * the customer already owns rather than issuing a conventional loan, so every
 * plan names the fund backing it.
 *
 * Its own collection rather than embedded: several products share the same
 * fund, and duplicating it into every product document would mean updating a
 * return figure in dozens of places.
 */
const mutualFundSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    amc: { type: String, required: true },
    category: { type: String, required: true },
    /** Indicative annualised return, in basis points (730 = 7.30%). */
    expectedReturnBps: { type: Number, required: true },
    riskLevel: { type: String, default: "Low" },
  },
  { timestamps: true },
);

export const MutualFund = mongoose.model("MutualFund", mutualFundSchema);
