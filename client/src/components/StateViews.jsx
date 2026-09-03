/**
 * Loading and error surfaces.
 *
 * With the data fetched in the browser rather than rendered on the server,
 * every page has a real in-flight state — so the skeletons mirror the shape of
 * the content they stand in for, and nothing jumps when the data lands.
 */

export function ErrorState({ error, onRetry, title = "Could not load this" }) {
  const isNetwork = error?.code === "NETWORK_ERROR";

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface px-6 py-14 text-center"
    >
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      <p className="text-sm text-ink-500">
        {error?.message ?? "Something went wrong."}
      </p>
      {isNetwork && (
        <p className="text-xs text-ink-400">
          Start the API with{" "}
          <code className="rounded bg-canvas px-1 py-0.5 text-ink-700">npm run dev</code> from the
          repo root, and check that MongoDB is running.
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-hairline bg-surface">
          <div className="skeleton h-56 rounded-none" />
          <div className="flex flex-col gap-3 border-t border-hairline p-5">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-6 w-28" />
            <div className="skeleton h-4 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]" aria-hidden>
      <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton mt-2 h-5 w-40" />
        <div className="skeleton mt-4 h-[340px] rounded-xl sm:h-[420px]" />
        <div className="mt-6 flex justify-center gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-8 w-8 rounded-full" />
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton mt-2 h-4 w-56" />
        <div className="skeleton mt-6 h-4 w-64" />
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="skeleton h-[62px] rounded-xl" />
          ))}
        </div>
        <div className="skeleton mt-4 h-12 rounded-xl" />
        <div className="skeleton mt-4 h-[52px] rounded-xl" />
      </section>
    </div>
  );
}

/** Announces the loading state to assistive tech without showing text. */
export function LoadingAnnouncement({ children = "Loading…" }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {children}
    </p>
  );
}
