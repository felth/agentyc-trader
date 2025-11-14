import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "../components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Agentyc Trader"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ultra-black text-white min-h-screen">
        <div className="relative min-h-screen">
          <main className="pb-28">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
