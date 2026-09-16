import type { Metadata } from "next";
import { DM_Sans, Montserrat } from "next/font/google";
import "./globals.css";

// Body copy stays on the original DM Sans; Montserrat is reserved
// for headings and the navbar wordmark (see globals.css).
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ag7cars.com"),
  title: {
    default: "AG7 Cars | Built on Passion, Driven by Trust.",
    template: "%s | AG7 Cars",
  },
  description:
    "Discover an exclusive collection of remarkable new and exceptional pre-owned supercars and luxury automobiles, curated for those who expect nothing but the extraordinary.",
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
    title: "AG7 Cars | Built on Passion, Driven by Trust.",
    description:
      "Discover an exclusive collection of remarkable new and exceptional pre-owned supercars and luxury automobiles, curated for those who expect nothing but the extraordinary.",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}