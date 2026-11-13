import type { Metadata } from "next";
import { Poppins, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DemoBanner from "@/components/layout/DemoBanner";
import { getHeaderUser } from "@/lib/auth";

const body = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Egiftcard — Digital Gift Cards in Nepal", template: "%s | Egiftcard" },
  description: "Buy digital gift cards with automatic delivery after verified payment. Prices in NPR.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getHeaderUser();
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="bg-surface-alt font-sans text-ink antialiased">
        <DemoBanner />
        <Header user={user} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
