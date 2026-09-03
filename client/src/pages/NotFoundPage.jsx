import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  useEffect(() => {
    document.title = "Not found | 1Fi";
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-hairline bg-surface px-6 py-16 text-center">
      <span className="numeric text-5xl font-semibold tracking-tight text-brand-600">404</span>
      <h1 className="text-xl font-semibold text-ink-900">We could not find that page</h1>
      <p className="text-sm text-ink-500">
        The product may have been renamed or is no longer on sale. Every live product is listed
        on the catalogue.
      </p>
      <Link
        to="/products"
        className="mt-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Back to all products
      </Link>
    </div>
  );
}
