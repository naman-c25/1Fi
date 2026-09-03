import { getEmiApplication } from "@/lib/catalog";
import { fail, ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/emi-applications/:reference
 *
 * Looks up a submitted application by its printed reference (e.g. 1FI-8KQ2M4).
 * Amounts come back exactly as they were snapshotted at submission time.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const { reference } = await params;
    const application = await getEmiApplication(reference.toUpperCase());

    if (!application) {
      return fail("APPLICATION_NOT_FOUND", `No application found for "${reference}".`, 404);
    }

    return ok(application);
  } catch (error) {
    return serverError(error);
  }
}
