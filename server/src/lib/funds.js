import { MutualFund } from "../models/MutualFund.js";

/**
 * There are four funds and they change roughly never, but every plan needs one
 * to render. Rather than a $lookup on every request, they are read once and
 * held for a minute.
 */
const TTL_MS = 60_000;

let cache = null;
let cachedAt = 0;

export async function getFundsByCode({ force = false } = {}) {
  const fresh = cache && Date.now() - cachedAt < TTL_MS;
  if (fresh && !force) return cache;

  const funds = await MutualFund.find().lean();
  cache = new Map(funds.map((fund) => [fund.code, fund]));
  cachedAt = Date.now();
  return cache;
}

/** Called by the seeder so a reseed is visible immediately. */
export function clearFundCache() {
  cache = null;
  cachedAt = 0;
}
