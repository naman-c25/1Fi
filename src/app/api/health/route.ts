import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Confirms the app can actually reach Postgres, and reports what is seeded.
 * Handy as a deploy smoke test and during the demo walkthrough.
 */
export async function GET() {
  try {
    const startedAt = Date.now();
    const [products, variants, emiPlans, funds, applications] = await Promise.all([
      prisma.product.count(),
      prisma.variant.count(),
      prisma.emiPlan.count(),
      prisma.mutualFund.count(),
      prisma.emiApplication.count(),
    ]);

    return ok({
      status: "ok",
      database: "connected",
      latencyMs: Date.now() - startedAt,
      counts: { products, variants, emiPlans, funds, applications },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serverError(error);
  }
}
