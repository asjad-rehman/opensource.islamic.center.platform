import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { todayISOInTZ } from "@/lib/time";
import { masjid } from "@/config/masjid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = todayISOInTZ(masjid.timezone);
    const announcements = (await store.getAnnouncements())
      .filter(a => a.active !== false && (!a.expiresOn || a.expiresOn >= today));
    return NextResponse.json({ announcements }, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Vercel-CDN-Cache-Control": "public, s-maxage=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}
