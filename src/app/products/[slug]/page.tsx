import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ProductExperience } from "@/components/ProductExperience";
import { ApiError, apiGet } from "@/lib/api-client";
import type { ProductDTO } from "@/lib/types";

// Rendered per request (getBaseUrl reads headers), but the catalogue fetch
// underneath is served from the Data Cache — see CATALOGUE_TTL_SECONDS.
export const revalidate = 60;

/**
 * `cache` dedupes the fetch between `generateMetadata` and the page body —
 * both run for the same request, and one API round trip is enough.
 */
const loadProduct = cache(async (slug: string): Promise<ProductDTO | null> => {
  try {
    return await apiGet<ProductDTO>(`/api/products/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) return { title: "Product not found" };

  const from = product.variants[0]?.price.display ?? "";

  return {
    title: `${product.name} on EMI`,
    description:
      product.tagline ??
      `Buy the ${product.name} from ${from} on a mutual-fund backed EMI plan.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="transition-colors hover:text-ink-700">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/products" className="transition-colors hover:text-ink-700">
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
            {[
              "Pick a colour, a capacity and a tenure. Prices and instalments update live.",
              "1Fi pledges units from the matching mutual fund as collateral — nothing is redeemed.",
              "Your instalment is auto-debited every month. The units stay invested throughout.",
              "Close early whenever you like; the pledge is released the same day.",
            ].map((step, index) => (
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
            This page is rendered from{" "}
            <code className="break-all text-ink-500">GET /api/products/{product.slug}</code> — {product.variantCount}{" "}
            variants and {product.variants[0]?.emiPlans.length ?? 0} plans, all from PostgreSQL.
          </p>
        </div>
      </section>
    </div>
  );
}
