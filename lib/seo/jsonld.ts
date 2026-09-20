// JSON-LD builders. Each function returns a plain object (never a
// string) — <JsonLd> below is the one place that serializes it, so
// every call site stays a typed object instead of hand-built JSON.
import { BUSINESS, SITE_NAME, SITE_URL } from "./site";

type JsonLdObject = Record<string, unknown>;

/** AutoDealer + LocalBusiness — the homepage's identity block. */
export function autoDealerJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": ["AutoDealer", "LocalBusiness"],
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS.legalName,
    legalName: BUSINESS.legalName,
    description: BUSINESS.description,
    url: SITE_URL,
    logo: BUSINESS.logo,
    image: BUSINESS.logo,
    telephone: BUSINESS.telephoneE164,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      ...(BUSINESS.streetAddress ? { streetAddress: BUSINESS.streetAddress } : {}),
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      ...(BUSINESS.postalCode ? { postalCode: BUSINESS.postalCode } : {}),
      addressCountry: BUSINESS.addressCountry,
    },
    ...(BUSINESS.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: BUSINESS.geo.latitude,
            longitude: BUSINESS.geo.longitude,
          },
        }
      : {}),
    openingHoursSpecification: BUSINESS.openingHours.map((spec) => {
      const [days, hours] = spec.split(" ");
      const [opens, closes] = hours.split("-");
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: expandDayRange(days),
        opens,
        closes,
      };
    }),
    sameAs: [...BUSINESS.sameAs],
    areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "AdministrativeArea", name })),
    priceRange: "₹₹₹₹",
  };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_CODES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Expands an "Mo-Sa" style range from the OpeningHoursSpecification
// shorthand into the list of full day names schema.org expects.
function expandDayRange(range: string): string[] {
  if (!range.includes("-")) {
    const index = DAY_CODES.indexOf(range);
    return index >= 0 ? [DAY_NAMES[index]] : [range];
  }
  const [start, end] = range.split("-");
  const startIndex = DAY_CODES.indexOf(start);
  const endIndex = DAY_CODES.indexOf(end);
  if (startIndex < 0 || endIndex < 0) return [];
  const days: string[] = [];
  for (let i = startIndex; ; i = (i + 1) % 7) {
    days.push(DAY_NAMES[i]);
    if (i === endIndex) break;
  }
  return days;
}

/** Organization — site-wide identity, used in the root layout. */
export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: BUSINESS.logo,
    sameAs: [...BUSINESS.sameAs],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BUSINESS.telephoneE164,
      email: BUSINESS.email,
      contactType: "customer service",
      areaServed: "IN",
    },
  };
}

/** WebSite — no SearchAction: /cars has no query-param-driven search
    endpoint to point one at, and a SearchAction that doesn't actually
    search would be worse than no SearchAction at all. */
export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

type VehicleOfferInput = {
  url: string;
  name: string;
  brand: string;
  model: string;
  modelDate?: number | null;
  vehicleConfiguration?: string | null;
  mileageFromOdometerKm?: number | null;
  fuelType?: string | null;
  vehicleTransmission?: string | null;
  bodyType?: string | null;
  color?: string | null;
  images: string[];
  description?: string | null;
  price: number | null;
  priceCurrency?: string;
  /** "New" cars use NewCondition; everything else (including the
      dealership's "Demo" category) is treated as used stock. */
  isNew: boolean;
  availability: "InStock" | "SoldOut" | "Reserved";
};

/** Vehicle + Offer — one car/deal detail page. */
export function vehicleJsonLd(input: VehicleOfferInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    "@id": `${input.url}#vehicle`,
    url: input.url,
    name: input.name,
    brand: { "@type": "Brand", name: input.brand },
    model: input.model,
    ...(input.modelDate ? { modelDate: String(input.modelDate) } : {}),
    ...(input.vehicleConfiguration ? { vehicleConfiguration: input.vehicleConfiguration } : {}),
    ...(input.mileageFromOdometerKm !== null && input.mileageFromOdometerKm !== undefined
      ? {
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: input.mileageFromOdometerKm,
            unitCode: "KMT",
          },
        }
      : {}),
    ...(input.fuelType ? { fuelType: input.fuelType } : {}),
    ...(input.vehicleTransmission ? { vehicleTransmission: input.vehicleTransmission } : {}),
    ...(input.bodyType ? { bodyType: input.bodyType } : {}),
    ...(input.color ? { color: input.color } : {}),
    image: input.images,
    ...(input.description ? { description: input.description } : {}),
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: input.priceCurrency ?? "INR",
      ...(input.price !== null ? { price: input.price } : {}),
      itemCondition: input.isNew
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
      availability: `https://schema.org/${input.availability}`,
      seller: { "@id": `${SITE_URL}/#business` },
    },
  };
}
