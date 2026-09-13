import type { Metadata } from "next";
import { Geist_Mono, Hanken_Grotesk, Public_Sans } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TestAppTile } from "@/components/layout/test-app-tile";
import { brand } from "@/lib/brand";
import "./globals.css";

// Public Sans is the workhorse — a civic/health typeface built for legibility
// at small sizes, with the tabular figures a storefront's prices rely on.
// Hanken Grotesk carries the wordmark and headings: a touch warmer and more
// characterful, so display type has its own voice without a second personality.
const publicSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — Online Pharmacy`,
    template: `%s — ${brand.name}`,
  },
  description: brand.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${hankenGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
        <TestAppTile />
      </body>
    </html>
  );
}
