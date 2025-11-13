import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavLinks } from "../components/NavLinks";

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
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-ultra-border bg-ultra-black/95">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="text-xs tracking-[0.2em] font-semibold text-gray-300">
                AGENTYC TRADER
              </div>
              <NavLinks />
            </div>
          </header>

          <main className="flex-1">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
