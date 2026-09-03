/**
 * Money helpers.
 *
 * Every amount that crosses the database or the API is an integer number of
 * paise. Rupees only exist for display. Rates are integer basis points
 * (1% = 100 bps), so "10.5%" is stored as 1050 and never as 0.105.
 */

export const PAISE_PER_RUPEE = 100;
export const BPS_PER_PERCENT = 100;

/** 127400 -> 12740000 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/** 12740000 -> 127400 */
export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/** Rounds a paise amount to the nearest whole rupee. */
export function roundPaiseToRupee(paise: number): number {
  return Math.round(paise / PAISE_PER_RUPEE) * PAISE_PER_RUPEE;
}

/**
 * Groups digits the Indian way — last three, then pairs: 12,74,00,000.
 *
 * Written by hand rather than via `Intl.NumberFormat` so the server render and
 * the client render are byte-identical regardless of the runtime's ICU data.
 * A mismatch here would be a hydration error on every price on the page.
 */
export function groupIndian(value: number): string {
  const negative = value < 0;
  const digits = Math.abs(Math.trunc(value)).toString();

  let grouped: string;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    const lastThree = digits.slice(-3);
    const rest = digits.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  return negative ? `-${grouped}` : grouped;
}

/** 12740000 -> "₹1,27,400" */
export function formatPaise(paise: number): string {
  return `₹${groupIndian(paiseToRupees(paise))}`;
}

/** 12740000 -> "1,27,400" (no symbol) */
export function formatPaisePlain(paise: number): string {
  return groupIndian(paiseToRupees(paise));
}

/** 1050 -> "10.5%", 0 -> "0%" */
export function formatBps(bps: number): string {
  const percent = bps / BPS_PER_PERCENT;
  const text = Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/0+$/, "");
  return `${text}%`;
}

/** Discount off MRP, as a whole-number percentage. */
export function discountPercent(mrpPaise: number, pricePaise: number): number {
  if (mrpPaise <= 0 || pricePaise >= mrpPaise) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}
