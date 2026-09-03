import { CatalogError, createEmiApplication } from "@/lib/catalog";
import { fail, ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

interface CreateBody {
  variantId?: unknown;
  emiPlanId?: unknown;
}

/**
 * POST /api/emi-applications
 *
 * Backs the "Proceed with this plan" button. Recomputes the instalment
 * server-side from the stored variant price and plan terms - the client's
 * numbers are never trusted - then persists the application and returns a
 * reference number.
 *
 * Body: { "variantId": "...", "emiPlanId": "..." }
 */
export async function POST(request: Request) {
  try {
    let body: CreateBody;
    try {
      body = (await request.json()) as CreateBody;
    } catch {
      return fail("INVALID_JSON", "Request body must be valid JSON.", 400);
    }

    const variantId = typeof body.variantId === "string" ? body.variantId.trim() : "";
    const emiPlanId = typeof body.emiPlanId === "string" ? body.emiPlanId.trim() : "";

    if (!variantId || !emiPlanId) {
      return fail(
        "VALIDATION_ERROR",
        "Both `variantId` and `emiPlanId` are required strings.",
        422,
      );
    }

    const application = await createEmiApplication({ variantId, emiPlanId });

    return ok(application, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof CatalogError) {
      return fail(error.code, error.message, error.status);
    }
    return serverError(error);
  }
}
