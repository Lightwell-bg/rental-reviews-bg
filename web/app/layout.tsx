import { headers } from "next/headers";

import { AnalyticsHeadScripts } from "@/components/AnalyticsScripts";
import { resolvePageSeo } from "@/lib/pageSeo";
import { getAnalyticsSettings, getPageSeoSettings, getSiteBrandName } from "@/lib/siteSettings";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [brand, settings] = await Promise.all([
    getSiteBrandName(),
    getPageSeoSettings(),
  ]);
  const home = resolvePageSeo("home", settings);

  return {
    title: {
      default: home.title,
      template: `%s · ${brand}`,
    },
    description: home.description,
    icons: {
      icon: [{ url: "/brand/icon.png", type: "image/png" }],
      apple: [{ url: "/brand/icon.png", type: "image/png" }],
    },
  };
}

function isPublicSitePath(pathname: string): boolean {
  return !pathname.startsWith("/admin");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const analytics =
    pathname && isPublicSitePath(pathname)
      ? await getAnalyticsSettings()
      : { head: "", body: "" };

  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <AnalyticsHeadScripts html={analytics.head} />
      </head>
      <body className="min-h-full font-sans text-zinc-900">{children}</body>
    </html>
  );
}
