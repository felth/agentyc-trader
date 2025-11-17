import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "../components/layout/BottomNav";
import { TopNav } from "../components/layout/TopNav";

export const metadata: Metadata = {
  title: "Agentyc Trader"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body className="bg-ultra-black text-white min-h-screen overflow-x-hidden">
        <div className="relative min-h-screen w-full max-w-full overflow-x-hidden">
          <TopNav />
          <main className="pb-24 w-full max-w-full overflow-x-hidden">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
