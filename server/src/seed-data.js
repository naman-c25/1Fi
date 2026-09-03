/**
 * Source of truth for the seeded catalogue.
 *
 * Both `server/src/seed.js` and `scripts/generate-images.mjs` import this file,
 * so the SVGs on disk and the URLs stored in MongoDB can never drift apart.
 *
 * Prices are written here in plain rupees for readability; the seeder converts
 * them to paise before anything touches the database.
 */

// ---------------------------------------------------------------------------
// Mutual funds the EMI plans are collateralised against
// ---------------------------------------------------------------------------

export const FUNDS = [
  {
    code: "LIQ-ADV",
    name: "1Fi Liquid Advantage Fund",
    amc: "1Fi Asset Management",
    category: "Liquid",
    expectedReturnBps: 690,
    riskLevel: "Low",
  },
  {
    code: "SD-DEBT",
    name: "1Fi Short Duration Debt Fund",
    amc: "1Fi Asset Management",
    category: "Debt",
    expectedReturnBps: 745,
    riskLevel: "Low to Moderate",
  },
  {
    code: "BAL-ADV",
    name: "1Fi Balanced Advantage Fund",
    amc: "1Fi Asset Management",
    category: "Hybrid",
    expectedReturnBps: 1020,
    riskLevel: "Moderate",
  },
  {
    code: "BLU-GRW",
    name: "1Fi Bluechip Growth Fund",
    amc: "1Fi Asset Management",
    category: "Equity - Large Cap",
    expectedReturnBps: 1280,
    riskLevel: "Moderately High",
  },
];

/**
 * The ladder every product offers: 0% up to 24 months, 10.5% beyond, with a
 * flat cashback on each plan. Short tenures are backed by the liquid fund,
 * long tenures by the growth funds.
 */
function standardPlans(cashback) {
  return [
    { tenureMonths: 3, interestRateBps: 0, cashback, processingFee: 0, fundCode: "LIQ-ADV" },
    { tenureMonths: 6, interestRateBps: 0, cashback, processingFee: 0, fundCode: "LIQ-ADV" },
    {
      tenureMonths: 12,
      interestRateBps: 0,
      cashback,
      processingFee: 0,
      fundCode: "SD-DEBT",
      isRecommended: true,
    },
    { tenureMonths: 24, interestRateBps: 0, cashback, processingFee: 0, fundCode: "SD-DEBT" },
    { tenureMonths: 36, interestRateBps: 1050, cashback, processingFee: 499, fundCode: "BAL-ADV" },
    { tenureMonths: 48, interestRateBps: 1050, cashback, processingFee: 499, fundCode: "BLU-GRW" },
    { tenureMonths: 60, interestRateBps: 1050, cashback, processingFee: 499, fundCode: "BLU-GRW" },
  ];
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const PRODUCTS = [
  {
    slug: "iphone-17-pro",
    name: "iPhone 17 Pro",
    brand: "Apple",
    tagline: "Aerospace-grade aluminium unibody with a vapour chamber.",
    description:
      "A19 Pro silicon, a 48MP Fusion triple camera and the brightest Super Retina XDR display Apple has shipped. Buy it against your mutual fund holdings and stay invested while you pay.",
    isNew: true,
    cameraStyle: "square-triple",
    highlights: [
      { label: "Display", value: '6.3" Super Retina XDR, 120Hz ProMotion' },
      { label: "Chip", value: "A19 Pro, 6-core GPU" },
      { label: "Camera", value: "48MP Fusion triple system, 8x optical zoom" },
      { label: "Battery", value: "Up to 33 hours video playback" },
    ],
    colors: [
      { name: "Silver", hex: "#E4E5E7", accentHex: "#9AA6BF" },
      { name: "Cosmic Orange", hex: "#E5713A", accentHex: "#F0A26B" },
      { name: "Deep Blue", hex: "#2F4573", accentHex: "#5C7FBF" },
    ],
    storages: [
      { label: "256GB", mrp: 134900, price: 127400, isDefault: true },
      { label: "512GB", mrp: 154900, price: 146900 },
      { label: "1TB", mrp: 174900, price: 166400 },
    ],
    plans: standardPlans(7500),
  },
  {
    slug: "samsung-galaxy-s25-ultra",
    name: "Galaxy S25 Ultra",
    brand: "Samsung",
    tagline: "Titanium frame, built-in S Pen and a 200MP main sensor.",
    description:
      "Snapdragon 8 Elite for Galaxy, a 6.9-inch Dynamic AMOLED 2X panel and Galaxy AI throughout One UI. Financed against your portfolio, not your salary slip.",
    isNew: true,
    cameraStyle: "pill-triple",
    highlights: [
      { label: "Display", value: '6.9" Dynamic AMOLED 2X, 1-120Hz' },
      { label: "Chip", value: "Snapdragon 8 Elite for Galaxy" },
      { label: "Camera", value: "200MP wide + 50MP ultrawide + dual telephoto" },
      { label: "Battery", value: "5000mAh, 45W wired charging" },
    ],
    colors: [
      { name: "Titanium Black", hex: "#3B3B3E", accentHex: "#6E7B8C" },
      { name: "Titanium Silverblue", hex: "#8FA4BA", accentHex: "#B9CDE2" },
      { name: "Titanium Whitesilver", hex: "#DADEE2", accentHex: "#A7B4C4" },
    ],
    storages: [
      { label: "256GB", mrp: 129999, price: 119999, isDefault: true },
      { label: "512GB", mrp: 141999, price: 131499 },
      { label: "1TB", mrp: 165999, price: 153999 },
    ],
    plans: standardPlans(7000),
  },
  {
    slug: "google-pixel-10-pro",
    name: "Pixel 10 Pro",
    brand: "Google",
    tagline: "Tensor G5 with seven years of OS and security updates.",
    description:
      "Google's computational photography stack on a Super Actua display, with Gemini Nano running on-device. Pick a tenure, keep your SIP running.",
    isNew: false,
    cameraStyle: "bar-dual",
    highlights: [
      { label: "Display", value: '6.3" Super Actua LTPO, 3000 nits' },
      { label: "Chip", value: "Google Tensor G5" },
      { label: "Camera", value: "50MP wide + 48MP ultrawide + 48MP 5x tele" },
      { label: "Support", value: "7 years of OS + security updates" },
    ],
    colors: [
      { name: "Obsidian", hex: "#212326", accentHex: "#5A6472" },
      { name: "Porcelain", hex: "#ECE6DC", accentHex: "#C9BFAE" },
      { name: "Jade", hex: "#4F7C64", accentHex: "#82B79A" },
    ],
    storages: [
      { label: "128GB", mrp: 106999, price: 99999, isDefault: true },
      { label: "256GB", mrp: 116999, price: 109999 },
      { label: "512GB", mrp: 132999, price: 124999 },
    ],
    plans: standardPlans(6000),
  },
  {
    slug: "oneplus-13",
    name: "OnePlus 13",
    brand: "OnePlus",
    tagline: "6000mAh silicon-carbon battery with 100W SuperVOOC.",
    description:
      "Snapdragon 8 Elite, a 2K ProXDR display and Hasselblad-tuned optics. A flagship that charges in half an hour and repays over five years if you want it to.",
    isNew: false,
    cameraStyle: "circle-dual",
    highlights: [
      { label: "Display", value: '6.82" 2K ProXDR LTPO, 120Hz' },
      { label: "Chip", value: "Snapdragon 8 Elite" },
      { label: "Camera", value: "Hasselblad triple 50MP system" },
      { label: "Battery", value: "6000mAh, 100W wired / 50W wireless" },
    ],
    colors: [
      { name: "Midnight Ocean", hex: "#173561", accentHex: "#4C7DBF" },
      { name: "Arctic Dawn", hex: "#E6EDF3", accentHex: "#A8BFD4" },
      { name: "Black Eclipse", hex: "#1B1B1D", accentHex: "#53585F" },
    ],
    storages: [
      { label: "256GB", mrp: 69999, price: 64999, isDefault: true },
      { label: "512GB", mrp: 76999, price: 71999 },
    ],
    plans: standardPlans(4000),
  },
  {
    slug: "nothing-phone-3",
    name: "Nothing Phone (3)",
    brand: "Nothing",
    tagline: "Glyph Matrix interface on a transparent rear panel.",
    description:
      "Nothing OS 3.0 on Snapdragon 8s Gen 4, with a rear Glyph Matrix that turns notifications into light. The most affordable way onto a 1Fi EMI plan.",
    isNew: true,
    cameraStyle: "circle-dual",
    highlights: [
      { label: "Display", value: '6.67" LTPO AMOLED, 120Hz' },
      { label: "Chip", value: "Snapdragon 8s Gen 4" },
      { label: "Camera", value: "50MP triple system with periscope tele" },
      { label: "Software", value: "Nothing OS 3.0, 5 years of updates" },
    ],
    colors: [
      { name: "White", hex: "#F1F1EF", accentHex: "#B7BDC4" },
      { name: "Black", hex: "#1C1C1E", accentHex: "#585D64" },
    ],
    storages: [
      { label: "256GB", mrp: 42999, price: 39999, isDefault: true },
      { label: "512GB", mrp: 46999, price: 43999 },
    ],
    plans: standardPlans(3000),
  },
];

/** "Cosmic Orange" -> "cosmic-orange" */
export function colorSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "256GB" -> "256gb" */
export function storageSlug(label) {
  return label.toLowerCase();
}

/** Where the generator writes, and what the database points at. */
export function imagePath(productSlug, color, view) {
  return `/images/${productSlug}-${colorSlug(color)}-${view}.svg`;
}
