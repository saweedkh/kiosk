import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { settingsApi } from "@/lib/api/settings";

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

const storeName = process.env.STORE_NAME || 'فروشگاه ساوید';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settingsData = await settingsApi.getSettings();
    const settings = settingsData?.result || {};
    const siteName = settings.site_name || storeName;
    const description = settings.description || "سیستم مدیریت کیوسک فروش";
    
    return {
      title: `کیوسک - ${siteName}`,
      description: description,
      openGraph: {
        title: `کیوسک - ${siteName}`,
        description: description,
        type: "website",
        ...(settings.logo_url && {
          images: [
            {
              url: settings.logo_url,
              width: 1200,
              height: 630,
              alt: siteName,
            },
          ],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title: `کیوسک - ${siteName}`,
        description: description,
        ...(settings.logo_url && {
          images: [settings.logo_url],
        }),
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: `کیوسک - ${storeName}`,
      description: "سیستم مدیریت کیوسک فروش",
    };
  }
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
