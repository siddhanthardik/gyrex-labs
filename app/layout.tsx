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
  title: "Gyrex Labs — Modern diagnostic lab platform",
  description:
    "Gyrex Labs gives diagnostic laboratories a professional online presence, digital bookings, and secure report delivery without disrupting existing workflows.",
  keywords: [
    "diagnostic lab software",
    "lab management platform",
    "online lab storefront",
    "lab report delivery",
    "diagnostic centre management",
    "Gyrex Labs",
  ],
  openGraph: {
    title: "Gyrex Labs — Modern diagnostic lab platform",
    description:
      "Give your diagnostic lab a professional online presence, digital bookings, and secure report delivery without disrupting existing workflows.",
    type: "website",
    url: "https://labs.gyrex.in",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
