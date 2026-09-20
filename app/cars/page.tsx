import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarsBrowser, { type BrowseCar } from "@/components/collection/CarsBrowser";
import { createClient } from "@/lib/supabase/server";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "AG7 Collection — New & Pre-Owned Cars in India",
  description:
    "Browse the full AG7 Cars collection: brand new and pre-owned supercars and luxury cars for sale in India. Filter by brand, body type, and budget.",
  alternates: {
    canonical: "/cars",
  },
  openGraph: {
    title: "AG7 Collection | AG7 Cars",
    description: "Browse every supercar and luxury car currently available at AG7 Cars.",
    url: "/cars",
  },
};

export default async function CarsPage() {
  const supabase = await createClient();

  const { data: carsData } = await supabase
    .from("cars")
    .select(
      "id, slug, brand, name, price, currency, status, image_urls, year, manufacturing_year, registration, ownership, fuel, km_driven, body_type, category, color"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const cars: BrowseCar[] = (carsData ?? []).map((car) => ({
    id: car.id,
    slug: car.slug,
    brand: car.brand,
    name: car.name,
    price: car.price,
    currency: car.currency,
    status: car.status,
    image: car.image_urls?.[0] ?? null,
    year: car.year,
    manufacturingYear: car.manufacturing_year,
    registration: car.registration,
    ownership: car.ownership,
    fuel: car.fuel,
    kmDriven: car.km_driven,
    bodyType: car.body_type,
    category: car.category,
    color: car.color,
  }));

  // Available first, then booked, then sold — regardless of when each
  // was listed. Array.sort is stable, so the created_at-desc order
  // from the query is preserved within each status group.
  const statusRank: Record<BrowseCar["status"], number> = {
    available: 0,
    booked: 1,
    sold: 2,
  };
  cars.sort((a, b) => statusRank[a.status] - statusRank[b.status]);

  return (
    <main className="min-h-screen bg-black">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "AG7 Collection", url: `${SITE_URL}/cars` },
        ])}
      />

      <Navbar />

      <div className="pt-24 sm:pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12 xl:px-16">
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-white/40 sm:text-left">
            Discover
          </p>

          <h1 className="mt-4 text-center font-display text-4xl font-semibold text-white sm:text-left sm:text-5xl">
            The AG7 Collection
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-center text-white/60 sm:mx-0 sm:text-left">
            Every car currently available at AG7 Cars — use the
            filters to find exactly what you're looking for.
          </p>

          <div className="mt-10">
            <CarsBrowser cars={cars} />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}