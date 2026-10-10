import { getJamaatTimes } from "@/lib/jamaat";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getJamaatTimes();
    return NextResponse.json({ ok: true, data }, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Vercel-CDN-Cache-Control": "public, s-maxage=30",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch times" }, { status: 500 });
  }
}
