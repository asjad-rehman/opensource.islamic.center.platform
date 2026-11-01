import { saveJamaatTimes, type JamaatTimes } from "@/lib/jamaat";
import { NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const NAMES = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" } as const;

function fail(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest) {
  if (!getAdminUser(req)) return fail("Your session has expired. Please sign in again.", 401);

  const body = await req.json().catch(() => null);
  const c = (body?.data ?? body) as Record<string, unknown> | null;
  if (!c || typeof c !== "object") return fail("Invalid request.");

  const afterAdhan = c.maghribAfterAdhan === true;
  const times: Record<string, string> = {};
  for (const [key, name] of Object.entries(NAMES)) {
    const v = typeof c[key] === "string" ? (c[key] as string).trim() : "";
    if (key === "maghrib" && afterAdhan) { times[key] = TIME_RE.test(v) ? v : ""; continue; }
    if (!TIME_RE.test(v)) return fail(`Enter a time for ${name}.`);
    times[key] = v;
  }

  if (!Array.isArray(c.jummah) || c.jummah.length === 0) return fail("Add at least one Jumuah slot.");
  if (c.jummah.length > 4) return fail("You can list up to 4 Jumuah slots.");
  const jummah = [];
  for (const [i, slot] of (c.jummah as unknown[]).entries()) {
    const s = slot as Record<string, unknown> | null;
    const khutbah = typeof s?.khutbah === "string" ? s.khutbah : "";
    const salah = typeof s?.salah === "string" ? s.salah : "";
    if (!TIME_RE.test(khutbah) || !TIME_RE.test(salah)) return fail(`Jumuah ${i + 1} needs both a khutbah and a salah time.`);
    if (salah < khutbah) return fail(`Jumuah ${i + 1}: salah can't be before the khutbah.`);
    jummah.push({ khutbah, salah });
  }

  const payload: JamaatTimes = {
    fajr: times.fajr, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha,
    maghribAfterAdhan: afterAdhan,
    jummah,
  };

  try {
    await saveJamaatTimes(payload);
    return Response.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (err: unknown) {
    console.error("[/api/jamaat/update] save failed:", err);
    return fail("Couldn't save the times. Please try again in a moment.", 500);
  }
}
