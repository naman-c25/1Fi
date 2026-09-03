import { useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Confirmation shown after `POST /api/emi-applications` succeeds. Every value
 * here is echoed from the response — the client never re-derives an amount.
 */
export function ProceedDialog({ application, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/45 p-4 backdrop-blur-sm sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proceed-title"
        className="animate-rise w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cash-50 text-cash-600"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
              <path
                d="M4.5 10.5l3.5 3.5 7.5-8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id="proceed-title" className="text-lg font-semibold text-ink-900">
              Plan locked in
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Your EMI application has been recorded. Reference{" "}
              <strong className="numeric text-ink-900">{application.reference}</strong>.
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 rounded-xl border border-hairline bg-canvas/60 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Product</dt>
            <dd className="text-right font-medium text-ink-900">
              {application.product.name}
              <span className="block text-xs font-normal text-ink-400">
                {application.variant.label}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Monthly instalment</dt>
            <dd className="numeric font-semibold text-ink-900">
              {application.monthlyAmount.display} × {application.plan.tenureMonths}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Interest rate</dt>
            <dd className="numeric font-medium text-ink-900">
              {application.plan.interestRate.display}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Total payable</dt>
            <dd className="numeric font-medium text-ink-900">
              {application.totalPayable.display}
            </dd>
          </div>
          {application.cashback.paise > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Cashback</dt>
              <dd className="numeric font-medium text-cash-600">
                {application.cashback.display}
              </dd>
            </div>
          )}
          {application.plan.fundName && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Backed by</dt>
              <dd className="text-right font-medium text-ink-900">
                {application.plan.fundName}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-hairline pt-2">
            <dt className="text-ink-500">Status</dt>
            <dd className="font-medium text-ink-900">{application.status}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-ink-400">
          Look it up any time at{" "}
          <a
            href={`${API_BASE}/api/emi-applications/${application.reference}`}
            target="_blank"
            rel="noreferrer"
            className="break-all rounded bg-canvas px-1 py-0.5 font-mono text-[11px] text-ink-500 underline decoration-ink-300 underline-offset-2"
          >
            GET /api/emi-applications/{application.reference}
          </a>
        </p>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}
