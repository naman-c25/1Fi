/**
 * Money helpers.
 *
 * Every amount stored in MongoDB is an integer number of paise, and every rate
 * is an integer number of basis points (1% = 100 bps). Rupees and percentages
 * only exist for display. Keeping money as integers means no floating point
 * drift can ever creep into a price or an instalment.
 */

export const PAISE_PER_RUPEE = 100;
export const BPS_PER_PERCENT = 100;

/** 127400 -> 12740000 */
export function rupeesToPaise(rupees) {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/** 12740000 -> 127400 */
export function paiseToRupees(paise) {
  return paise / PAISE_PER_RUPEE;
}

/** Rounds a paise amount to the nearest whole rupee. */
export function roundPaiseToRupee(paise) {
  return Math.round(paise / PAISE_PER_RUPEE) * PAISE_PER_RUPEE;
}

/**
 * Groups digits the Indian way — last three, then pairs: 12,74,00,000.
 *
 * Done by hand rather than through `Intl.NumberFormat` so the string is
 * identical no matter which runtime or ICU build formats it.
 */
export function groupIndian(value) {
  const negative = value < 0;
  const digits = Math.abs(Math.trunc(value)).toString();

  let grouped;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    const lastThree = digits.slice(-3);
    const rest = digits.slice(0, -3);
    grouped = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${lastThree}`;
  }

  return negative ? `-${grouped}` : grouped;
}

/** 12740000 -> "₹1,27,400" */
export function formatPaise(paise) {
  return `₹${groupIndian(paiseToRupees(paise))}`;
}

/** 1050 -> "10.5%", 0 -> "0%" */
export function formatBps(bps) {
  const percent = bps / BPS_PER_PERCENT;
  const text = Number.isInteger(percent)
    ? String(percent)
    : percent.toFixed(2).replace(/0+$/, "");
  return `${text}%`;
}

/** Discount off MRP, as a whole-number percentage. */
export function discountPercent(mrpPaise, pricePaise) {
  if (mrpPaise <= 0 || pricePaise >= mrpPaise) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}

/**
 * Every amount crossing the API is shaped like this: `paise` is the canonical
 * integer to compute with, `display` is what the UI prints. The client never
 * formats money itself.
 */
export function money(paise) {
  return { paise, rupees: paiseToRupees(paise), display: formatPaise(paise) };
}

/** Same idea for interest rates. */
export function rate(bps) {
  return { bps, percent: bps / BPS_PER_PERCENT, display: formatBps(bps) };
}
