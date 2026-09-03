"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { EmiPlanList } from "./EmiPlanList";
import { PlanSummary } from "./PlanSummary";
import { ProceedDialog } from "./ProceedDialog";
import { ProductGallery } from "./ProductGallery";
import type { ApiResponse, EmiApplicationDTO, ProductDTO, VariantDTO } from "@/lib/types";

function pickVariant(
  variants: VariantDTO[],
  colorName: string,
  storage: string,
  fallback: VariantDTO,
): VariantDTO {
  return (
    variants.find((v) => v.colorName === colorName && v.storage === storage) ??
    // The exact combination may not exist; keep the colour and take any capacity.
    variants.find((v) => v.colorName === colorName) ??
    variants.find((v) => v.storage === storage) ??
    fallback
  );
}

/**
 * Owns the two choices that drive the page — which variant, which plan — and
 * submits the result. Every variant arrives from `/api/products/:slug` with its
 * plans already priced, so switching colour or capacity re-prices the ladder
 * instantly without another round trip.
 */
export function ProductExperience({ product }: { product: ProductDTO }) {
  const defaultVariant = useMemo(
    () => product.variants.find((v) => v.id === product.defaultVariantId) ?? product.variants[0],
    [product],
  );

  const [colorName, setColorName] = useState(defaultVariant.colorName);
  const [storage, setStorage] = useState(defaultVariant.storage);

  const variant = useMemo(
    () => pickVariant(product.variants, colorName, storage, defaultVariant),
    [product.variants, colorName, storage, defaultVariant],
  );

  const [selectedPlanId, setSelectedPlanId] = useState(
    () =>
      variant.emiPlans.find((plan) => plan.isRecommended)?.id ?? variant.emiPlans[0]?.id ?? "",
  );

  // Plan ids are stable across variants (a plan belongs to the product), so a
  // colour or capacity change keeps the customer's chosen tenure selected.
  const plan =
    variant.emiPlans.find((candidate) => candidate.id === selectedPlanId) ?? variant.emiPlans[0];

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<EmiApplicationDTO | null>(null);

  // Keep the address bar in step with the selection so a link shares the exact
  // configuration being looked at, without a navigation.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", variant.sku);
    window.history.replaceState(null, "", url.toString());
  }, [variant.sku]);

  const proceed = useCallback(async () => {
    if (!plan) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/emi-applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, emiPlanId: plan.id }),
      });

      const payload = (await response.json()) as ApiResponse<EmiApplicationDTO>;

      if (!payload.success) {
        setError(payload.error.message);
        return;
      }

      setApplication(payload.data);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }, [plan, variant.id]);

  return (
    <>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]">
        <ProductGallery
          product={product}
          variant={variant}
          onSelectColor={setColorName}
          onSelectStorage={setStorage}
        />

        <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
          {/* Pricing */}
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="numeric text-4xl font-semibold tracking-tight text-ink-900">
              {variant.price.display}
            </p>
            {variant.discountPercent > 0 && (
              <span className="numeric pb-1 text-sm text-ink-300 line-through">
                {variant.mrp.display}
              </span>
            )}
          </div>

          {variant.discountPercent > 0 && (
            <p className="numeric mt-1 text-sm font-medium text-cash-600">
              You save {variant.savings.display} ({variant.discountPercent}% off MRP)
            </p>
          )}

          <p className="mt-1 text-xs text-ink-400">
            Inclusive of all taxes ·{" "}
            <span className="numeric break-all">{variant.sku}</span>
          </p>

          {/* Plans */}
          <h2 className="mt-6 text-[15px] font-medium text-ink-700">
            EMI plans backed by mutual funds
          </h2>

          {variant.emiPlans.length > 0 && plan ? (
            <>
              <div className="mt-3">
                <EmiPlanList
                  plans={variant.emiPlans}
                  selectedPlanId={plan.id}
                  onSelect={setSelectedPlanId}
                />
              </div>

              <div className="mt-4">
                <PlanSummary plan={plan} variant={variant} />
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={proceed}
                disabled={submitting || !variant.inStock}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-center text-[15px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
              >
                {submitting ? (
                  <>
                    <span
                      aria-hidden
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                    Submitting…
                  </>
                ) : !variant.inStock ? (
                  "Out of stock"
                ) : (
                  <span className="numeric">
                    Proceed with {plan.monthlyAmount.display} × {plan.tenureMonths} months
                  </span>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-ink-400">
                No credit check · Your units stay invested · Cancel any time before disbursal
              </p>
            </>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-ink-400">
              No EMI plans are configured for this product yet.
            </p>
          )}
        </section>
      </div>

      {application && (
        <ProceedDialog application={application} onClose={() => setApplication(null)} />
      )}
    </>
  );
}
