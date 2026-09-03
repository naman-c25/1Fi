import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { getProduct } from "../api.js";
import { ProductExperience } from "../components/ProductExperience.jsx";
import {
  ErrorState,
  LoadingAnnouncement,
  ProductPageSkeleton,
} from "../components/StateViews.jsx";
import { useApi } from "../hooks/useApi.js";
import NotFoundPage from "./NotFoundPage.jsx";

const HOW_IT_WORKS = [
  "Pick a colour, a capacity and a tenure. Prices and instalments update live.",
  "1Fi pledges units from the matching mutual fund as collateral — nothing is redeemed.",
  "Your instalment is auto-debited every month. The units stay invested throughout.",
  "Close early whenever you like; the pledge is released the same day.",
];

export default function ProductPage() {
  const { slug } = useParams();
  const { data: product, error, loading, reload } = useApi(() => getProduct(slug), [slug]);

  // A single-page app has no server-rendered <title>, so it is set here.
  useEffect(() => {
    document.title = product ? `${product.name} on EMI | 1Fi` : "1Fi — EMI Store";
  }, [product]);

  if (loading) {
    return (
      <>
        <LoadingAnnouncement>Loading product…</LoadingAnnouncement>
        <ProductPageSkeleton />
      </>
    );
  }

  if (error?.status === 404) return <NotFoundPage />;
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load this product" />;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="transition-colors hover:text-ink-700">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/products" className="transition-colors hover:text-ink-700">
              {product.category}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-ink-700" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductExperience product={product} />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
          <h2 className="text-base font-semibold text-ink-900">About the {product.name}</h2>
          {product.description && (
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{product.description}</p>
          )}

          {product.highlights.length > 0 && (
            <dl className="mt-5 divide-y divide-hairline border-t border-hairline">
              {product.highlights.map((highlight) => (
                <div
                  key={highlight.label}
                  className="grid grid-cols-[minmax(0,96px)_minmax(0,1fr)] gap-3 py-2.5 text-sm"
                >
                  <dt className="text-ink-400">{highlight.label}</dt>
                  <dd className="text-ink-900">{highlight.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
          <h2 className="text-base font-semibold text-ink-900">How the EMI works</h2>
          <ol className="mt-3 space-y-3 text-sm text-ink-500">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden
                  className="numeric mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700"
                >
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <p className="numeric mt-5 rounded-lg bg-canvas/70 p-3 text-xs text-ink-400">
            This page was fetched from{" "}
            <code className="break-all text-ink-500">GET /api/products/{product.slug}</code> —{" "}
            {product.variantCount} variants and {product.variants[0]?.emiPlans.length ?? 0} plans,
            all from one MongoDB document.
          </p>
        </div>
      </section>
    </div>
  );
}
