import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", "", sessionCookieOptions(0));
  return response;
}
