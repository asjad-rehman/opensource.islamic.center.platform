import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { remoteWriteFile } from "@/lib/remote-storage";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const resources = await store.getHalalResources(true);
    const fresh = req.nextUrl.searchParams.get("fresh") === "1";
    return NextResponse.json({ resources }, fresh ? undefined : { headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "public, s-maxage=60" } });
  } catch {
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { restaurants, meatSupply } = await req.json();

    const updatePayload: any = {};
    if (restaurants !== undefined) updatePayload.restaurants = restaurants;
    if (meatSupply !== undefined) updatePayload.meatSupply = meatSupply;

    const updated = await store.updateHalalResources(updatePayload);

    return NextResponse.json({ success: true, resources: updated });
  } catch (err: any) {
    console.error("Update failed", err);
    return NextResponse.json({ error: "Update failed: " + err.message }, { status: 500 });
  }
}
