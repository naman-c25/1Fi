/**
 * Shapes returned by the REST API and consumed by the React components.
 *
 * Amounts are always sent as a `Money` object: `paise` is the canonical
 * integer value to compute with, `display` is the pre-formatted Indian-notation
 * string so every surface renders prices identically.
 */

export interface Money {
  paise: number;
  rupees: number;
  display: string;
}

export interface Rate {
  bps: number;
  percent: number;
  display: string;
}

export interface ImageDTO {
  url: string;
  alt: string;
}

export interface HighlightDTO {
  label: string;
  value: string;
}

export interface FundDTO {
  code: string;
  name: string;
  amc: string;
  category: string;
  expectedReturn: Rate;
  riskLevel: string;
}

export interface EmiPlanDTO {
  id: string;
  tenureMonths: number;
  tenureLabel: string;
  interestRate: Rate;
  isZeroInterest: boolean;
  isRecommended: boolean;
  monthlyAmount: Money;
  /** Last instalment; differs from `monthlyAmount` only by the rounding remainder. */
  finalInstalment: Money;
  totalRepayment: Money;
  totalInterest: Money;
  processingFee: Money;
  cashback: Money;
  totalPayable: Money;
  effectiveCost: Money;
  /** Fund value that stays pledged for the tenure. */
  pledgedAmount: Money;
  fund: FundDTO;
}

export interface VariantDTO {
  id: string;
  sku: string;
  slug: string;
  colorName: string;
  colorHex: string;
  storage: string;
  label: string;
  mrp: Money;
  price: Money;
  savings: Money;
  discountPercent: number;
  inStock: boolean;
  isDefault: boolean;
  images: ImageDTO[];
  /** Plans priced against *this* variant. */
  emiPlans: EmiPlanDTO[];
  lowestMonthlyAmount: Money;
}

export interface ProductDTO {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  tagline: string | null;
  description: string | null;
  isNew: boolean;
  url: string;
  highlights: HighlightDTO[];
  colors: { name: string; hex: string }[];
  storageOptions: string[];
  variantCount: number;
  defaultVariantId: string;
  variants: VariantDTO[];
}

export interface ProductSummaryDTO {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  tagline: string | null;
  isNew: boolean;
  url: string;
  image: ImageDTO | null;
  colors: { name: string; hex: string }[];
  storageOptions: string[];
  variantCount: number;
  startingPrice: Money;
  startingMrp: Money;
  discountPercent: number;
  lowestMonthlyAmount: Money;
  longestTenureMonths: number;
  emiPlanCount: number;
}

export interface EmiApplicationDTO {
  reference: string;
  status: string;
  createdAt: string;
  product: { name: string; slug: string; url: string };
  variant: { id: string; label: string; sku: string };
  plan: {
    id: string;
    tenureMonths: number;
    tenureLabel: string;
    interestRate: Rate;
  };
  principal: Money;
  monthlyAmount: Money;
  totalPayable: Money;
  cashback: Money;
}

/** Envelope every endpoint responds with. */
export type ApiResponse<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string } };
