import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import SiteShell from "@/components/site-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ichattiesburg.org"),
  title: {
    default: "Islamic Center of Hattiesburg",
    template: "%s | Islamic Center of Hattiesburg",
  },
  description:
    "The Islamic Center of Hattiesburg (ICH) serves the Muslim community of Hattiesburg, Mississippi with prayer services, Islamic education, and community programs.",
  keywords: [
    "Islamic Center Hattiesburg",
    "ICH",
    "masjid",
    "mosque",
    "Muslim",
    "Mississippi",
    "prayer times",
    "Jumuah",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ichattiesburg.org",
    siteName: "Islamic Center of Hattiesburg",
    title: "Islamic Center of Hattiesburg",
    description: "Serving the Muslim community of Hattiesburg, Mississippi.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Islamic Center of Hattiesburg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Islamic Center of Hattiesburg",
    description: "Serving the Muslim community of Hattiesburg, Mississippi.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable} font-sans antialiased`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
