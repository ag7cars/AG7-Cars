import type { Metadata } from "next";
import { DM_Sans, Montserrat } from "next/font/google";
import "./globals.css";
import JsonLd from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/seo/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AG7 Cars | Buy Supercars & Luxury Cars in India",
    template: "%s | AG7 Cars",
  },
  description:
    "Discover an exclusive collection of remarkable new and exceptional pre-owned supercars and luxury automobiles, curated for those who expect nothing but the extraordinary.",
  applicationName: "AG7 Cars",
  generator: "Next.js",
  keywords: [
    "AG7 Cars",
    "luxury cars India",
    "supercars India",
    "buy supercars in India",
    "pre-owned luxury cars India",
    "premium cars Indore",
    "exotic car dealership India",
  ],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "AG7 Cars",
    title: "AG7 Cars | Buy Supercars & Luxury Cars in India",
    description:
      "Discover an exclusive collection of remarkable new and exceptional pre-owned supercars and luxury automobiles, curated for those who expect nothing but the extraordinary.",
    url: SITE_URL,
    locale: "en_IN",
    images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: "AG7 Cars" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AG7 Cars | Buy Supercars & Luxury Cars in India",
    description:
      "Discover an exclusive collection of remarkable new and exceptional pre-owned supercars and luxury automobiles, curated for those who expect nothing but the extraordinary.",
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: "/images/ag7-logo.png",
    shortcut: "/images/ag7-logo.png",
    apple: "/images/ag7-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={`${dmSans.variable} ${montserrat.variable}`}>
      <head>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
      <body>{children}</body>
    </html>
  );
}