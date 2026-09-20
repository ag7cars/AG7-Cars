// Central place for every fact reused across metadata and JSON-LD —
// business identity, contact details, and social profiles — so the
// same NAP data can't drift out of sync between the footer, the
// <meta> tags, and the structured data.

export const SITE_URL = "https://www.ag7cars.com";
export const SITE_NAME = "AG7 Cars";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/ag7-logo.png`;

export const BUSINESS = {
  legalName: "AG7 Cars",
  description:
    "AG7 Cars is a dealership in Indore, Madhya Pradesh, India dealing in brand new and pre-owned supercars and premium luxury cars.",
  telephoneDisplay: "+91 72477 77724",
  telephoneE164: "+917247777724",
  email: "info@ag7cars.com",
  // NOTE: no exact street address / PIN code / geo-coordinates exist
  // anywhere in this codebase (the footer only ever shows city +
  // state) — fill these in to match the business's Google Business
  // Profile exactly once available. Left blank rather than guessed,
  // since a wrong street address or lat/long is worse for local SEO
  // than an incomplete one.
  streetAddress: "",
  addressLocality: "Indore",
  addressRegion: "Madhya Pradesh",
  postalCode: "",
  addressCountry: "IN",
  geo: null as { latitude: number; longitude: number } | null,
  // Placeholder — confirm against the real Google Business Profile
  // hours before relying on this for local-pack results.
  openingHours: ["Mo-Sa 10:00-19:00"],
  sameAs: [
    "https://www.instagram.com/AG7CarsOfficial",
    "https://www.facebook.com/share/1D3agitBpX/?mibextid=wwXIfr",
  ],
  areaServed: ["Indore", "Madhya Pradesh", "India"],
  logo: `${SITE_URL}/images/ag7-logo.png`,
} as const;
