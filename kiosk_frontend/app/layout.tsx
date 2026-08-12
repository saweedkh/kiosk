import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import {
  resolveSiteDescription,
  resolveSiteName,
  settingsApi,
} from "@/lib/api/settings";

const vazir = localFont({
  src: [
    {
      path: "../font/Vazir-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../font/Vazir-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../font/Vazir.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../font/Vazir-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../font/Vazir-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../font/Vazir-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-vazir",
  display: "swap",
});

// Always resolve metadata from backend settings (DB), not env defaults
export const dynamic = process.env.TAURI_BUILD === "1" ? "auto" : "force-dynamic";
export const revalidate = process.env.TAURI_BUILD === "1" ? false : 0;

export async function generateMetadata(): Promise<Metadata> {
  if (process.env.TAURI_BUILD === "1") {
    return {
      title: "کیوسک",
      description: "Kiosk self-service",
    };
  }
  const settings = await settingsApi.getSettingsServer();
  const siteName = resolveSiteName(settings);
  const description = resolveSiteDescription(settings);

  const title = siteName ? `کیوسک - ${siteName}` : "کیوسک";
  const metaDescription = description || undefined;

  return {
    title,
    description: metaDescription,
    openGraph: {
      title,
      ...(metaDescription ? { description: metaDescription } : {}),
      type: "website",
      ...(settings.logo_url
        ? {
            images: [
              {
                url: settings.logo_url,
                width: 1200,
                height: 630,
                alt: siteName || "لوگو",
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(metaDescription ? { description: metaDescription } : {}),
      ...(settings.logo_url ? { images: [settings.logo_url] } : {}),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${vazir.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
