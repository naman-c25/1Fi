import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api - a self-describing index of the available endpoints. */
export async function GET() {
  return ok({
    name: "1Fi EMI Store API",
    version: "1.0.0",
    endpoints: [
      { method: "GET", path: "/api/health", description: "Database connectivity + seed counts" },
      {
        method: "GET",
        path: "/api/products",
        description: "Catalogue listing",
        query: { brand: "optional, e.g. Apple", search: "optional free text" },
      },
      {
        method: "GET",
        path: "/api/products/:idOrSlug",
        description: "One product with variants, images and per-variant EMI plans",
      },
      {
        method: "GET",
        path: "/api/products/:idOrSlug/emi-plans",
        description: "EMI plans priced against one variant",
        query: { variantId: "optional variant id or SKU; defaults to the product default" },
      },
      {
        method: "POST",
        path: "/api/emi-applications",
        description: "Submit the selected plan",
        body: { variantId: "string", emiPlanId: "string" },
      },
      {
        method: "GET",
        path: "/api/emi-applications/:reference",
        description: "Look up a submitted application",
      },
    ],
  });
}
