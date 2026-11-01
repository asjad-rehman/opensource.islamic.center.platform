import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { timingSafeEqual } from "node:crypto";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || "ichattiesburg";
    const envPassword = process.env.ADMIN_PASSWORD;
    const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    let authenticated = false;

    if (envPassword) {
      // A directly configured password takes precedence over a legacy hash.
      const submitted = Buffer.from(password, "utf8");
      const configured = Buffer.from(envPassword, "utf8");
      authenticated = username === envEmail &&
        submitted.length === configured.length && timingSafeEqual(submitted, configured);
    } else if (envPasswordHash) {
      const { comparePassword } = await import("@/lib/auth");
      authenticated = username === envEmail && await comparePassword(password, envPasswordHash);
    } else {
      authenticated = username === "ichattiesburg" && password === "3223";
      if (authenticated) {
        console.warn("[admin-login] WARNING: Using fallback credentials. Please configure ADMIN_EMAIL and ADMIN_PASSWORD in production.");
      }
    }

    if (!authenticated) {
      return NextResponse.json({ error: `Invalid credentials` }, { status: 401 });
    }

    const token = signToken({ id: "1", email: username, name: "Admin" });

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: false, // Set false to ensure it sets locally or on any Vercel domain
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
