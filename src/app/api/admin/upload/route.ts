import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { remoteWriteFile } from "@/lib/remote-storage";
import { unauthorized } from "@/lib/admin-routes";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Identify the image by its actual bytes, never by the uploaded filename, so a
// renamed .html/.svg file can't be published on the site's own domain.
function detectImage(buf: Buffer): "jpg" | "png" | "gif" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a") return "gif";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export async function POST(req: NextRequest) {
  if (!getAdminUser(req)) return unauthorized();

  let file: File | null = null;
  try {
    const formData = await req.formData();
    const value = formData.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return NextResponse.json({ error: "Upload was interrupted. Please try again." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB — try a smaller photo or a screenshot of it.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectImage(buffer);
  if (!kind) {
    return NextResponse.json({ error: "Only JPG, PNG, GIF or WebP photos can be uploaded. (iPhone HEIC photos: share them as JPG first.)" }, { status: 400 });
  }

  const filename = `${randomUUID()}.${kind}`;
  try {
    await remoteWriteFile(filename, buffer.toString("base64"));
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: "The photo couldn't be saved. Please try again in a moment." }, { status: 500 });
  }
  return NextResponse.json({ success: true, url: `/uploads/${filename}` });
}
