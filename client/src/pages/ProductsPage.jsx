import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getProducts } from "../api.js";
import { ProductGrid } from "../components/ProductCard.jsx";
import {
  ErrorState,
  LoadingAnnouncement,
  ProductGridSkeleton,
} from "../components/StateViews.jsx";
import { useApi } from "../hooks/useApi.js";

/**
 * `?brand=` and `?search=` live in the URL and are passed straight through to
 * `GET /api/products`, so a filtered view is shareable and the back button
 * works.
 */
export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const brand = searchParams.get("brand") ?? "";
  const search = searchParams.get("search") ?? "";

  const [draft, setDraft] = useState(search);

  useEffect(() => {
    document.title = "All products | 1Fi";
  }, []);

  // Keep the input in step when the URL changes from outside (back button).
  useEffect(() => {
    setDraft(search);
  }, [search]);

  const {
    data: products,
    error,
    loading,
    reload,
  } = useApi(() => getProducts({ brand, search }), [brand, search]);

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  // Brands come from the unfiltered catalogue so the chips do not disappear as
  // soon as one is chosen.
  const { data: allProducts } = useApi(() => getProducts(), []);
  const brands = [...new Set((allProducts ?? []).map((p) => p.brand))];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">All products</h1>
        <p className="mt-1 text-sm text-ink-400">
          {loading ? "Loading…" : `${products?.length ?? 0} product${products?.length === 1 ? "" : "s"}`}
          {(brand || search) && " · filtered"}
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            setParam("search", draft.trim());
          }}
        >
          <label htmlFor="search" className="sr-only">
            Search products
          </label>
          <input
            id="search"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search by name, brand or tagline…"
            className="w-full rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParam("brand", "")}
            aria-pressed={!brand}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              !brand
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-hairline bg-surface text-ink-700 hover:border-ink-300"
            }`}
          >
            All
          </button>
          {brands.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setParam("brand", brand === name ? "" : name)}
              aria-pressed={brand === name}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                brand === name
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-hairline bg-surface text-ink-700 hover:border-ink-300"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <>
          <LoadingAnnouncement>Loading products…</LoadingAnnouncement>
          <ProductGridSkeleton count={6} />
        </>
      )}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && <ProductGrid products={products} />}
    </div>
  );
}
