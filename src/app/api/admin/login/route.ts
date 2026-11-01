import { NextRequest, NextResponse } from "next/server";
import { signToken, sessionCookieOptions, comparePassword } from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { timingSafeEqual, createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const IS_PROD = process.env.NODE_ENV === "production";

// Hash both sides first so the comparison is constant-time regardless of length.
function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = await rateLimit(`login:${ip}`, 10, 15 * 60);
  if (!limit.ok) {
    const mins = Math.max(1, Math.ceil(limit.retryAfter / 60));
    return NextResponse.json(
      { error: `Too many sign-in attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
    }

    const envUser = process.env.ADMIN_EMAIL?.trim().toLowerCase() || "ichattiesburg";
    const envPassword = process.env.ADMIN_PASSWORD;
    const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    let authenticated = false;
    if (envPassword) {
      authenticated = safeEqual(username, envUser) && safeEqual(password, envPassword);
    } else if (envPasswordHash) {
      authenticated = safeEqual(username, envUser) && await comparePassword(password, envPasswordHash);
    } else if (!IS_PROD) {
      // Local development only. Production refuses to log in without real credentials.
      authenticated = username === "ichattiesburg" && password === "3223";
      if (authenticated) console.warn("[admin-login] Using the local development login. Set ADMIN_PASSWORD before deploying.");
    } else {
      console.error("[admin-login] ADMIN_PASSWORD is not configured — login disabled.");
      return NextResponse.json({ error: "Admin login is not configured on this server. Contact the site maintainer." }, { status: 503 });
    }

    if (!authenticated) {
      return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
    }

    await resetRateLimit(`login:${ip}`);
    const token = signToken({ id: "1", email: username, name: "Admin" });
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", token, sessionCookieOptions());
    return response;
  } catch (e) {
    console.error("[admin-login]", e);
    return NextResponse.json({ error: "Sign-in failed on the server. Please try again." }, { status: 500 });
  }
}
