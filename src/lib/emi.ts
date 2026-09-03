/**
 * EMI maths.
 *
 * Nothing derived is ever stored in the catalogue tables — `emi_plans` holds
 * only the *terms* (tenure, rate, cashback, fee). The instalment is computed
 * against the price of the variant the customer is actually looking at, so a
 * price change can never leave a stale monthly amount behind in the database.
 */

import { BPS_PER_PERCENT, PAISE_PER_RUPEE, roundPaiseToRupee } from "./money";

export interface EmiTerms {
  /** Amount being financed, in paise. */
  principalPaise: number;
  tenureMonths: number;
  /** Annual interest rate in basis points (1050 = 10.5%). */
  interestRateBps: number;
  cashbackPaise?: number;
  processingFeePaise?: number;
}

export interface EmiBreakdown {
  principalPaise: number;
  tenureMonths: number;
  interestRateBps: number;
  /** Instalment rounded to a whole rupee, the way EMIs are quoted in India. */
  monthlyAmountPaise: number;
  /**
   * The last instalment, which absorbs the rounding remainder. Equal to
   * `monthlyAmountPaise` unless rounding left a few rupees over.
   */
  finalInstalmentPaise: number;
  /** Everything repaid across the tenure, principal + interest. */
  totalRepaymentPaise: number;
  /** Interest component across the whole tenure. */
  totalInterestPaise: number;
  processingFeePaise: number;
  cashbackPaise: number;
  /** Everything the customer pays: repayment + fee. */
  totalPayablePaise: number;
  /** What it really costs after cashback lands. */
  effectiveCostPaise: number;
}

/**
 * Standard reducing-balance instalment:
 *
 *        P x i x (1 + i)^n
 *   E = ---------------------      i = annual rate / 12
 *        (1 + i)^n  -  1
 *
 * At 0% the formula is undefined (0/0), so the principal is simply split
 * evenly across the tenure.
 */
export function monthlyInstalmentPaise(
  principalPaise: number,
  tenureMonths: number,
  interestRateBps: number,
): number {
  if (tenureMonths <= 0) {
    throw new Error("tenureMonths must be greater than 0");
  }
  if (principalPaise < 0) {
    throw new Error("principalPaise cannot be negative");
  }

  if (interestRateBps === 0) {
    return roundPaiseToRupee(principalPaise / tenureMonths);
  }

  const monthlyRate = interestRateBps / BPS_PER_PERCENT / 100 / 12;
  const growth = Math.pow(1 + monthlyRate, tenureMonths);
  const exact = (principalPaise * monthlyRate * growth) / (growth - 1);

  return roundPaiseToRupee(exact);
}

/** Full, display-ready breakdown for one plan applied to one price. */
export function computeEmi(terms: EmiTerms): EmiBreakdown {
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

  // A 0% plan must repay the price and not a rupee more, so the total is
  // pinned to the principal and the rounding remainder lands on the last
  // instalment. Interest-bearing plans are quoted the usual way: instalment
  // x tenure.
  const totalRepaymentPaise =
    interestRateBps === 0 ? principalPaise : monthlyAmountPaise * tenureMonths;

  const finalInstalmentPaise =
    totalRepaymentPaise - monthlyAmountPaise * (tenureMonths - 1);
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

/** Human label for a tenure: 3 -> "3 months", 12 -> "12 months", 24 -> "24 months". */
export function tenureLabel(tenureMonths: number): string {
  return tenureMonths === 1 ? "1 month" : `${tenureMonths} months`;
}

/**
 * Units of the backing fund that have to stay pledged for the tenure.
 * Purely illustrative, but it is what makes these plans "backed by mutual
 * funds" rather than a plain loan — the customer stays invested while paying.
 */
export function pledgedUnitsPaise(principalPaise: number, loanToValuePercent = 80): number {
  if (loanToValuePercent <= 0) return 0;
  return Math.round((principalPaise * 100) / loanToValuePercent / PAISE_PER_RUPEE) * PAISE_PER_RUPEE;
}
