import type { Metadata } from "next";

import { ProductGrid } from "@/components/ProductCard";
import { apiGet } from "@/lib/api-client";
import type { ProductSummaryDTO } from "@/lib/types";

// Rendered per request (getBaseUrl reads headers), but the catalogue fetch
// underneath is served from the Data Cache — see CATALOGUE_TTL_SECONDS.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "All products",
  description: "Every phone available on a 1Fi mutual-fund backed EMI plan.",
};

/** `?brand=Apple` and `?search=pixel` are handed straight to `GET /api/products`. */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; search?: string }>;
}) {
  const { brand, search } = await searchParams;

  const query = new URLSearchParams();
  if (brand) query.set("brand", brand);
  if (search) query.set("search", search);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  const products = await apiGet<ProductSummaryDTO[]>(`/api/products${suffix}`);
  const brands = [...new Set(products.map((product) => product.brand))];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">All products</h1>
        <p className="mt-1 text-sm text-ink-400">
          {products.length} product{products.length === 1 ? "" : "s"}
          {brands.length > 0 && ` from ${brands.join(", ")}`}
          {(brand || search) && " · filtered"}
        </p>
      </header>

      <ProductGrid products={products} />
    </div>
  );
}
