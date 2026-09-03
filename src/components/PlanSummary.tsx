"use client";

import { useState } from "react";

import type { EmiPlanDTO, VariantDTO } from "@/lib/types";

function Row({ label, value, tone }: { label: string; value: string; tone?: "cash" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <dt className="text-ink-500">{label}</dt>
      <dd
        className={`numeric font-medium ${tone === "cash" ? "text-cash-600" : "text-ink-900"}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Collapsible breakdown of the selected plan. Every figure here is computed
 * server-side by `lib/emi.ts` and arrives pre-formatted, so what the customer
 * reads is exactly what the application row will be written with.
 */
export function PlanSummary({ plan, variant }: { plan: EmiPlanDTO; variant: VariantDTO }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-hairline bg-canvas/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-ink-700">
          Plan details &amp; backing fund
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
        >
          <path
            d="M5 7.5l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-hairline px-4 py-3">
          <dl className="text-sm">
            <Row label="Item price" value={variant.price.display} />
            <Row
              label={
                plan.finalInstalment.paise === plan.monthlyAmount.paise
                  ? `Monthly instalment × ${plan.tenureMonths}`
                  : `Monthly instalment × ${plan.tenureMonths - 1}`
              }
              value={plan.monthlyAmount.display}
            />
            {plan.finalInstalment.paise !== plan.monthlyAmount.paise && (
              <Row label="Final instalment" value={plan.finalInstalment.display} />
            )}
            <Row label="Total repayment" value={plan.totalRepayment.display} />
            {plan.totalInterest.paise > 0 && (
              <Row label="Interest component" value={plan.totalInterest.display} />
            )}
            {plan.processingFee.paise > 0 && (
              <Row label="Processing fee (one-time)" value={plan.processingFee.display} />
            )}
            {plan.cashback.paise > 0 && (
              <Row label="Cashback" value={`− ${plan.cashback.display}`} tone="cash" />
            )}

            <div className="mt-2 flex items-center justify-between gap-4 border-t border-hairline pt-2.5">
              <dt className="font-semibold text-ink-900">Effective cost</dt>
              <dd className="numeric text-base font-semibold text-ink-900">
                {plan.effectiveCost.display}
              </dd>
            </div>
          </dl>

          <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              Backed by
            </p>
            <p className="mt-1 text-sm font-medium text-ink-900">{plan.fund.name}</p>
            <p className="numeric mt-0.5 text-xs text-ink-500">
              {plan.fund.category} · {plan.fund.riskLevel} risk ·{" "}
              {plan.fund.expectedReturn.display} indicative return
            </p>
            <p className="numeric mt-2 text-xs text-ink-500">
              Units worth <strong className="text-ink-700">{plan.pledgedAmount.display}</strong>{" "}
              stay pledged for {plan.tenureLabel} — they remain invested and keep earning.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
