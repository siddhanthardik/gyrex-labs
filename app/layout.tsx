import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gyrex Labs — The B2B Digital Platform for Diagnostic Laboratories",
  description:
    "Gyrex Labs gives diagnostic laboratories a branded online storefront, digital report delivery, and patient engagement — without replacing your existing LIS or billing software. Built for lab owners and chains across India.",
  keywords: [
    "diagnostic lab software",
    "lab management platform",
    "diagnostic laboratory B2B",
    "online lab storefront",
    "lab report delivery",
    "diagnostic centre management",
    "Gyrex Labs",
  ],
  openGraph: {
    title: "Gyrex Labs — The B2B Digital Platform for Diagnostic Laboratories",
    description:
      "Give your diagnostic lab a branded online storefront, digital report delivery, and patient engagement — without replacing your LIS.",
    type: "website",
    url: "https://labs.gyrex.in",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
