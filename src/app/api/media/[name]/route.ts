import { NextRequest, NextResponse } from "next/server";
import { remoteReadFile } from "@/lib/remote-storage";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };

// Serves /uploads/<name> for photos uploaded since the last deploy (wired up
// as a fallback rewrite in next.config.ts, so files in the build win).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const m = /^[a-zA-Z0-9-]+\.([a-z]+)$/.exec(name);
  const type = m ? TYPES[m[1]] : undefined;
  if (!type) return new NextResponse("Not found", { status: 404 });

  const data = await remoteReadFile(name);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
      // Upload names are random UUIDs, so the content never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
