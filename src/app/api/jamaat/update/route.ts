import { getJamaatTimes, saveJamaatTimes, isValidJamaatTimes } from "@/lib/jamaat";
import { NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = getAdminUser(req);
  if (!admin) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const candidate = body.data ?? body;

    if (!isValidJamaatTimes(candidate)) {
      return Response.json({ ok: false, error: "Invalid payload — missing required fields" }, { status: 400 });
    }

    // Merge with existing so a partial update doesn't wipe untouched fields
    const existing = await getJamaatTimes(true);
    const merged = {
      ...existing,
      ...candidate,
      jummah: Array.isArray(candidate.jummah) && candidate.jummah.length
        ? candidate.jummah
        : existing.jummah,
    };

    await saveJamaatTimes(merged);
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/jamaat/update] save failed:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
