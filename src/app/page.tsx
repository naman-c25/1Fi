import Link from "next/link";

import { ProductGrid } from "@/components/ProductCard";
import { apiGet } from "@/lib/api-client";
import type { ProductSummaryDTO } from "@/lib/types";

// Rendered per request (getBaseUrl reads headers), but the catalogue fetch
// underneath is served from the Data Cache — see CATALOGUE_TTL_SECONDS.
export const revalidate = 60;

const PITCH = [
  {
    title: "Stay invested",
    body: "Your units stay in the market and keep compounding while you repay.",
  },
  {
    title: "0% for up to 24 months",
    body: "Short tenures carry no interest at all — you pay exactly the sticker price.",
  },
  {
    title: "No credit check",
    body: "The plan is secured by your holdings, so your score is never pulled.",
  },
];

export default async function HomePage() {
  const products = await apiGet<ProductSummaryDTO[]>("/api/products");

  return (
    <div className="flex flex-col gap-10">
      <section className="overflow-hidden rounded-2xl border border-hairline bg-surface">
        <div className="grid gap-6 p-7 sm:p-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              EMI backed by mutual funds
            </span>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-[40px]">
              Buy the phone. <span className="text-brand-600">Keep the portfolio.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
              1Fi lends against the mutual funds you already own. Pick a tenure from 3 to 60
              months, pay 0% interest for the first two years, and let your units carry on
              earning the whole time.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Browse {products.length} phones
              </Link>
              <a
                href="/api"
                className="rounded-xl border border-hairline bg-surface px-5 py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-300"
              >
                Explore the API
              </a>
            </div>
          </div>

          <dl className="grid gap-3">
            {PITCH.map((item) => (
              <div key={item.title} className="rounded-xl border border-hairline bg-canvas/60 p-4">
                <dt className="text-sm font-semibold text-ink-900">{item.title}</dt>
                <dd className="mt-0.5 text-sm text-ink-500">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink-900">
              Available on EMI
            </h2>
            <p className="mt-0.5 text-sm text-ink-400">
              {products.length} products · every colour and capacity priced separately
            </p>
          </div>
        </div>
        <ProductGrid products={products} />
      </section>
    </div>
  );
}
