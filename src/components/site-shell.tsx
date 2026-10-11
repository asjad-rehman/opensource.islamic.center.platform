"use client";

import { usePathname } from "next/navigation";
import AnnouncementsBanner from "@/components/announcements-banner";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { LenisProvider } from "@/components/lenis-provider";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/display" || pathname.startsWith("/display/")) return children;

  return (
    <LenisProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AnnouncementsBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </LenisProvider>
  );
}
