import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ICH } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | ICH Admin" },
  robots: { index: false, follow: false },
};

// The admin area has its own simple chrome — no public banners, menu or footer.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f8", fontFamily: "Inter,sans-serif" }}>
      <header style={{ background: ICH.primaryDark, color: "#fff", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/uploads/logo.png" alt="" style={{ height: 32, width: "auto", filter: "brightness(0) invert(1)" }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>ICH Admin</span>
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "6px 10px", border: "1px solid rgba(255,255,255,.35)", borderRadius: 6 }}>
            View website <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}
