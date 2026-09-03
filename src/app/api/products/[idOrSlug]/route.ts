import { getProduct } from "@/lib/catalog";
import { fail, ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/:idOrSlug
 *
 * Full product payload: highlights, every variant with its images and pricing,
 * and the EMI plans already priced against each variant.
 * `:idOrSlug` accepts either the cuid primary key or the URL slug.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    const { idOrSlug } = await params;
    const product = await getProduct(idOrSlug);

    if (!product) {
      return fail("PRODUCT_NOT_FOUND", `No product found for "${idOrSlug}".`, 404);
    }

    return ok(product, {
      variantCount: product.variantCount,
      emiPlanCount: product.variants[0]?.emiPlans.length ?? 0,
    });
  } catch (error) {
    return serverError(error);
  }
}
