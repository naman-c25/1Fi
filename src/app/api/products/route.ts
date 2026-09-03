import type { NextRequest } from "next/server";

import { listProducts } from "@/lib/catalog";
import { ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 *
 * Catalogue listing. Optional filters:
 *   ?brand=Apple      exact brand match (case-insensitive)
 *   ?search=pixel     matches name, brand or tagline
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const brand = searchParams.get("brand")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    const products = await listProducts({ brand, search });

    return ok(products, {
      count: products.length,
      filters: { brand: brand ?? null, search: search ?? null },
    });
  } catch (error) {
    return serverError(error);
  }
}
