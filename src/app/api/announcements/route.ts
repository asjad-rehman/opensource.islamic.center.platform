import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const announcements = await store.getAnnouncements();
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
