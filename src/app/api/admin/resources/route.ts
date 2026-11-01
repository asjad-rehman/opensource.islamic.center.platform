import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getAdminUser } from "@/lib/auth";
import { parsePayload, type Schema } from "@/lib/validate";
import { unauthorized, serverError } from "@/lib/admin-routes";

export const dynamic = "force-dynamic";

const schema: Schema = {
  restaurants: { type: "text", max: 20000, label: "Halal restaurants" },
  meatSupply: { type: "text", max: 20000, label: "Halal meat supply" },
};

export async function GET(req: NextRequest) {
  try {
    const resources = await store.getHalalResources(true);
    const fresh = req.nextUrl.searchParams.get("fresh") === "1";
    return NextResponse.json({ resources }, fresh ? undefined : { headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "public, s-maxage=60" } });
  } catch {
    return NextResponse.json({ error: "Failed to load resources." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!getAdminUser(req)) return unauthorized();
  const parsed = parsePayload(schema, await req.json().catch(() => null), true);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const resources = await store.updateHalalResources(parsed.data);
    return NextResponse.json({ success: true, resources });
  } catch (e) {
    return serverError("save the halal list", e);
  }
}
