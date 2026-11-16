import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Inclusive_Sans } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TestAppTile } from "@/components/layout/test-app-tile";
import { brand } from "@/lib/brand";
import "./globals.css";

// Inclusive Sans carries body, nav, labels and buttons; Fraunces — a serif with
// real character — carries every headline and product name. The pairing is
// lifted from incubyte.co, where the big green serif IS the brand's voice.
const inclusiveSans = Inclusive_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400"],
});

// Variable font: no `weight` (Next forbids pairing it with `axes`), so the full
// weight range is available and `opsz` lets large display sizes optically size.
const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  axes: ["opsz"],
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
      className={`${inclusiveSans.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
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
