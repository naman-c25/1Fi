/**
 * EMI maths.
 *
 * Nothing derived is ever stored. A product document holds only the *terms* of
 * each plan (tenure, rate, cashback, fee); the instalment is computed against
 * the price of the variant the customer is actually looking at, at request
 * time. That is why a product with 9 variants needs 7 plans and not 63, and
 * why changing a price can never leave a stale monthly amount in the database.
 */

import { BPS_PER_PERCENT, PAISE_PER_RUPEE, roundPaiseToRupee } from "./money.js";

/**
 * Standard reducing-balance instalment:
 *
 *        P x i x (1 + i)^n
 *   E = ---------------------      i = annual rate / 12
 *        (1 + i)^n  -  1
 *
 * At 0% that formula is 0/0, so the principal is simply split evenly.
 */
export function monthlyInstalmentPaise(principalPaise, tenureMonths, interestRateBps) {
  if (tenureMonths <= 0) throw new Error("tenureMonths must be greater than 0");
  if (principalPaise < 0) throw new Error("principalPaise cannot be negative");

  if (interestRateBps === 0) {
    return roundPaiseToRupee(principalPaise / tenureMonths);
  }

  const monthlyRate = interestRateBps / BPS_PER_PERCENT / 100 / 12;
  const growth = (1 + monthlyRate) ** tenureMonths;
  const exact = (principalPaise * monthlyRate * growth) / (growth - 1);

  return roundPaiseToRupee(exact);
}

/**
 * Full, display-ready breakdown for one plan applied to one price.
 *
 * @param {{ principalPaise: number, tenureMonths: number, interestRateBps: number,
 *           cashbackPaise?: number, processingFeePaise?: number }} terms
 */
export function computeEmi(terms) {
  const {
    principalPaise,
    tenureMonths,
    interestRateBps,
    cashbackPaise = 0,
    processingFeePaise = 0,
  } = terms;

  const monthlyAmountPaise = monthlyInstalmentPaise(
    principalPaise,
    tenureMonths,
    interestRateBps,
  );

  // A 0% plan must repay the price and not a rupee more, so the total is pinned
  // to the principal and the whole-rupee rounding remainder lands on the last
  // instalment. Interest-bearing plans are quoted the usual way: EMI x tenure.
  const totalRepaymentPaise =
    interestRateBps === 0 ? principalPaise : monthlyAmountPaise * tenureMonths;

  const finalInstalmentPaise = totalRepaymentPaise - monthlyAmountPaise * (tenureMonths - 1);
  const totalInterestPaise = Math.max(0, totalRepaymentPaise - principalPaise);
  const totalPayablePaise = totalRepaymentPaise + processingFeePaise;

  return {
    principalPaise,
    tenureMonths,
    interestRateBps,
    monthlyAmountPaise,
    finalInstalmentPaise,
    totalRepaymentPaise,
    totalInterestPaise,
    processingFeePaise,
    cashbackPaise,
    totalPayablePaise,
    effectiveCostPaise: totalPayablePaise - cashbackPaise,
  };
}

/** 3 -> "3 months" */
export function tenureLabel(tenureMonths) {
  return tenureMonths === 1 ? "1 month" : `${tenureMonths} months`;
}

/**
 * Units of the backing fund that stay pledged for the tenure. Illustrative,
 * but it is what makes these plans "backed by mutual funds" rather than a
 * plain loan — the customer stays invested while paying.
 */
export function pledgedUnitsPaise(principalPaise, loanToValuePercent = 80) {
  if (loanToValuePercent <= 0) return 0;
  return (
    Math.round((principalPaise * 100) / loanToValuePercent / PAISE_PER_RUPEE) * PAISE_PER_RUPEE
  );
}
