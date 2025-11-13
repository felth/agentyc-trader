import "./globals.css";
import type { Metadata } from "next";
import { NavLinks } from "../components/NavLinks";

export const metadata: Metadata = {
  title: "Agentyc Trader",
  description: "Agentic trading journal and daily brief",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ultra-black text-white min-h-screen">
        <header className="border-b border-ultra-border px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <NavLinks />
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
        </main>
      </body>
    </html>
  );
}
