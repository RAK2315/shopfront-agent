import type { Metadata } from "next";
import { Alegreya, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const alegreya = Alegreya({ variable: "--font-alegreya", subsets: ["latin"], display: "swap" });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Shopfront Agent", template: "%s · Shopfront Agent" },
  description: "Turn product photos into a PayPal-backed store that AI shopping agents can buy from.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${alegreya.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
