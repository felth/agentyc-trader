import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "../components/layout/BottomNav";
import { TopNav } from "../components/layout/TopNav";
import { APP_METADATA } from "@/lib/config/app";

export const metadata: Metadata = {
  title: APP_METADATA.title,
  description: APP_METADATA.description,
  metadataBase: new URL(APP_METADATA.url),
  alternates: {
    canonical: APP_METADATA.url,
  },
  openGraph: {
    title: APP_METADATA.title,
    description: APP_METADATA.description,
    url: APP_METADATA.url,
    siteName: APP_METADATA.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: APP_METADATA.title,
    description: APP_METADATA.description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body className="bg-ultra-black text-white min-h-screen overflow-x-hidden">
        <div className="relative min-h-screen w-full max-w-full overflow-x-hidden">
          <TopNav />
          <main className="pb-20 w-full max-w-full overflow-x-hidden">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
