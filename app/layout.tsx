import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ag7cars.com"),
  title: {
    default: "AG7 Cars | Luxury, Supercars & Exceptional Automobiles",
    template: "%s | AG7 Cars",
  },
  description:
    "Discover exceptional pre-owned supercars, luxury cars and new automobiles at AG7 Cars.",
  applicationName: "AG7 Cars",
  generator: "Next.js",
  keywords: [
    "AG7 Cars",
    "luxury cars",
    "supercars",
    "pre-owned supercars",
    "luxury cars India",
    "premium cars",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "AG7 Cars",
    title: "AG7 Cars | Luxury, Supercars & Exceptional Automobiles",
    description:
      "Discover exceptional pre-owned supercars, luxury cars and new automobiles at AG7 Cars.",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}