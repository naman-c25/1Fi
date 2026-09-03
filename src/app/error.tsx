"use client";

import { useEffect } from "react";

/**
 * Almost always a database that is unreachable (missing or wrong DATABASE_URL,
 * or an unseeded database), so the recovery hint points there.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-hairline bg-surface px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-ink-900">Something went wrong</h1>
      <p className="text-sm text-ink-500">
        The catalogue could not be loaded. If you are running this locally, check that{" "}
        <code className="rounded bg-canvas px-1 py-0.5 text-ink-700">DATABASE_URL</code> points at
        a reachable PostgreSQL instance and that{" "}
        <code className="rounded bg-canvas px-1 py-0.5 text-ink-700">npm run db:seed</code> has
        been run.
      </p>
      {error.digest && (
        <p className="numeric text-xs text-ink-300">Digest: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Try again
      </button>
    </div>
  );
}
