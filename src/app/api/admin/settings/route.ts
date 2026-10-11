import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Public GET — settings are needed by frontend pages
export async function GET(req: NextRequest) {
  try {
    const settings = await store.getSettings();
    const fresh = req.nextUrl.searchParams.get("fresh") === "1";
    return NextResponse.json({ settings }, fresh ? undefined : { headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "public, s-maxage=60" } });
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const updates = await req.json();
    const settings = await store.updateSettings(updates);
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update settings: " + err.message }, { status: 500 });
  }
}
