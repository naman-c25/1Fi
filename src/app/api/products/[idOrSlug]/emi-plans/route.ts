import type { NextRequest } from "next/server";

import { getEmiPlans } from "@/lib/catalog";
import { fail, ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/:idOrSlug/emi-plans?variantId=...
 *
 * The plans for one product, priced against one variant. The product page hits
 * this whenever the shopper switches colour or storage, because a different
 * price means a different instalment. Without `variantId` the product's default
 * variant is used.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    const { idOrSlug } = await params;
    const variantId = request.nextUrl.searchParams.get("variantId")?.trim() || undefined;

    const result = await getEmiPlans(idOrSlug, variantId);

    if (!result) {
      return fail(
        "PLANS_NOT_FOUND",
        variantId
          ? `No variant "${variantId}" on product "${idOrSlug}".`
          : `No product found for "${idOrSlug}".`,
        404,
      );
    }

    return ok(result, { count: result.emiPlans.length });
  } catch (error) {
    return serverError(error);
  }
}
