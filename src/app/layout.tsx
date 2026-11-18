import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { FeedbackWidget } from "@/components/FeedbackWidget";

const overpass = localFont({
  src: [
    { path: "./fonts/overpass-latin-wght-normal.woff2", weight: "400 900", style: "normal" },
    { path: "./fonts/overpass-latin-wght-italic.woff2", weight: "400 900", style: "italic" },
  ],
  variable: "--font-sans",
});

const overpassMono = localFont({
  src: "./fonts/overpass-mono-latin-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "All About Zimbabwe: the survival guide",
    template: "%s · All About Zimbabwe",
  },
  description:
    "Plain-language guides to Zimbabwean paperwork, USD & ZiG money, housing, solar & ZESA, and a 3D map of all 10 provinces built from OpenStreetMap.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${overpass.variable} ${overpassMono.variable}`}
    >
      <body className="min-h-screen bg-[#0c0e0c] text-[#e9e5db] antialiased selection:bg-[#ffd200] selection:text-[#0c0e0c]">
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
