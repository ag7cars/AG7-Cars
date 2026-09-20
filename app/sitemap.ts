import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo/site";

// A plain, cookie-free Supabase client — sitemap.ts has no incoming
// request to read cookies from (unlike the server components, which
// use lib/supabase/server.ts), and this only ever runs anonymous,
// read-only SELECTs against publicly-readable rows.
function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/cars`, changeFrequency: "hourly", priority: 0.9 },
  { url: `${SITE_URL}/live-deals`, changeFrequency: "hourly", priority: 0.8 },
  { url: `${SITE_URL}/deliveries`, changeFrequency: "daily", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getPublicClient();

  const [{ data: cars }, { data: deals }, { data: deliveries }] = await Promise.all([
    supabase
      .from("cars")
      .select("slug, updated_at")
      .eq("is_published", true),
    supabase
      .from("live_deals")
      .select("id, updated_at")
      .eq("is_published", true),
    supabase
      .from("deliveries")
      .select("id, updated_at")
      .eq("is_published", true),
  ]);

  const carEntries: MetadataRoute.Sitemap = (cars ?? []).map((car) => ({
    url: `${SITE_URL}/cars/${car.slug}`,
    lastModified: car.updated_at ? new Date(car.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const dealEntries: MetadataRoute.Sitemap = (deals ?? []).map((deal) => ({
    url: `${SITE_URL}/live-deals/${deal.id}`,
    lastModified: deal.updated_at ? new Date(deal.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const deliveryEntries: MetadataRoute.Sitemap = (deliveries ?? []).map((delivery) => ({
    url: `${SITE_URL}/deliveries/${delivery.id}`,
    lastModified: delivery.updated_at ? new Date(delivery.updated_at) : undefined,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...STATIC_ROUTES, ...carEntries, ...dealEntries, ...deliveryEntries];
}
