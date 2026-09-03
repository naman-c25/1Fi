function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3" fill="none">
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The plan ladder from the brief: monthly amount x tenure on the left, the
 * interest rate on the right, cashback underneath. A real radio group, so it
 * is keyboard- and screen-reader-navigable.
 */
export function EmiPlanList({ plans, selectedPlanId, onSelect, busy = false }) {
  return (
    <div
      role="radiogroup"
      aria-label="EMI plans"
      aria-busy={busy}
      className={`flex flex-col gap-2 transition-opacity ${busy ? "opacity-60" : ""}`}
    >
      {plans.map((plan) => {
        const selected = plan.id === selectedPlanId;

        return (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(plan.id)}
            className={`relative rounded-xl border px-4 py-3 text-left transition-all ${
              selected
                ? "border-brand-600 bg-brand-50 shadow-[0_0_0_1px_var(--color-brand-600)_inset]"
                : "border-hairline bg-surface hover:border-brand-300 hover:bg-brand-50/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="numeric text-[15px] font-semibold text-ink-900">
                  {plan.monthlyAmount.display}
                  <span className="mx-1.5 font-normal text-ink-400">×</span>
                  {plan.tenureLabel}
                </p>

                {plan.cashback.paise > 0 && (
                  <p className="numeric mt-1 text-xs font-medium text-cash-600">
                    Additional cashback of {plan.cashback.display}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                <span
                  className={`numeric whitespace-nowrap text-sm font-medium ${
                    plan.isZeroInterest ? "text-ink-700" : "text-ink-500"
                  }`}
                >
                  {plan.interestRate.display} interest
                </span>
                <span
                  aria-hidden
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                    selected
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-ink-300 bg-surface text-transparent"
                  }`}
                >
                  <CheckIcon />
                </span>
              </div>
            </div>

            {plan.isRecommended && (
              <span className="absolute -top-2 left-3 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Most popular
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
