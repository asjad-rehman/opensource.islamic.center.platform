import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getAdminUser } from "@/lib/auth";
import { parsePayload, type Schema } from "@/lib/validate";
import { unauthorized, serverError } from "@/lib/admin-routes";

export const dynamic = "force-dynamic";

const schema: Schema = {
  address: { type: "string", max: 200 },
  addressUrl: { type: "url", label: "Google Maps link" },
  phone: { type: "string", max: 40 },
  email: { type: "email", label: "Contact email" },
  missionText: { type: "text", max: 3000, label: "Mission text" },
  jumuahLocation: { type: "string", max: 120, label: "Jumuah location" },
  oakGroveTitle: { type: "string", max: 160, label: "Project title" },
  oakGroveDescription: { type: "text", max: 3000, label: "Project description" },
  oakGroveUrl: { type: "url", label: "Fundraiser link" },
  zeffyOneTimeId: { type: "string", max: 80, label: "One-time donation form" },
  zeffyMonthlyId: { type: "string", max: 80, label: "Monthly donation form" },
  masjidShortName: { type: "string", max: 20, label: "Short name" },
  footerDescription: { type: "text", max: 400, label: "Footer description" },
  facebookUrl: { type: "url", label: "Facebook link" },
  instagramUrl: { type: "url", label: "Instagram link" },
  heroText: { type: "text", max: 400, label: "Home page welcome text" },
};

// Public GET — settings are needed by frontend pages
export async function GET(req: NextRequest) {
  try {
    const settings = await store.getSettings();
    const fresh = req.nextUrl.searchParams.get("fresh") === "1";
    return NextResponse.json({ settings }, fresh ? undefined : { headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "public, s-maxage=60" } });
  } catch {
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!getAdminUser(req)) return unauthorized();
  const parsed = parsePayload(schema, await req.json().catch(() => null), true);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const settings = await store.updateSettings(parsed.data);
    return NextResponse.json({ success: true, settings });
  } catch (e) {
    return serverError("save settings", e);
  }
}
