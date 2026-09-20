import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import Navbar from "@/components/layout/Navbar";
import CollectionCarousel, {
  type CollectionCar,
} from "@/components/home/CollectionCarousel";
import LiveDealsStrip, {
  type LiveDeal,
} from "@/components/home/LiveDealsStrip";
import DeliveriesGallery, {
  type Delivery,
} from "@/components/home/DeliveriesGallery";
import AboutStats from "@/components/home/AboutStats";
import FounderSection from "@/components/home/FounderSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import ContactSection from "@/components/home/ContactSection";
import Footer from "@/components/layout/Footer";
import { WhatsAppIcon } from "@/components/layout/icons";
import { createClient } from "@/lib/supabase/server";
import JsonLd from "@/components/seo/JsonLd";
import { autoDealerJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  // A plain string here would NOT pick up the root layout's
  // title.template — Next only applies a layout's template to
  // child segments, and this page is the same route segment ("/")
  // as the layout that defines it. `absolute` spells out the exact
  // title this page should render instead of relying on that.
  title: {
    absolute: "AG7 Cars | Buy Supercars & Luxury Cars in India",
  },
  description:
    "Buy brand new and pre-owned supercars and luxury cars in India at AG7 Cars, Indore. Browse live deals, delivery moments, and the full collection.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AG7 Cars | Buy Supercars & Luxury Cars in India",
    description:
      "Premium dealership in Indore, India for brand new and pre-owned supercars and luxury automobiles.",
    url: "/",
  },
};

export default async function Home() {
  const supabase = await createClient();

  const { data: heroImagesData } = await supabase
    .from("hero_images")
    .select("slot, position, image_url")
    .order("position", { ascending: true });

  const desktopImages: string[] = [];
  const mobileImages: string[] = [];

  for (const row of heroImagesData ?? []) {
    if (row.slot === "desktop") desktopImages.push(row.image_url);
    if (row.slot === "mobile") mobileImages.push(row.image_url);
  }

  const { data: carsData } = await supabase
    .from("cars")
    .select(
      "id, slug, brand, name, price, currency, status, image_urls, color, color_hex, year, manufacturing_year, registration, ownership, fuel, km_driven"
    )
    .eq("is_published", true)
    // Sold and booked cars stay off the homepage teaser carousel —
    // it's meant to showcase what's actually available right now;
    // the full Collection page still lists every status.
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(20);

  const cars: CollectionCar[] = (carsData ?? []).map((car) => ({
    id: car.id,
    slug: car.slug,
    brand: car.brand,
    name: car.name,
    price: car.price,
    currency: car.currency,
    status: car.status,
    image: car.image_urls?.[0] ?? null,
    color: car.color,
    colorHex: car.color_hex,
    year: car.year,
    manufacturingYear: car.manufacturing_year,
    registration: car.registration,
    ownership: car.ownership,
    fuel: car.fuel,
    kmDriven: car.km_driven,
  }));

  const { data: dealsData } = await supabase
    .from("live_deals")
    .select("id, brand, name, original_price, deal_price, currency, category, image_urls, color, color_hex")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const deals: LiveDeal[] = (dealsData ?? []).map((deal) => ({
    id: deal.id,
    brand: deal.brand,
    name: deal.name,
    originalPrice: deal.original_price,
    dealPrice: deal.deal_price,
    currency: deal.currency,
    category: deal.category,
    image: deal.image_urls?.[0] ?? null,
    color: deal.color,
    colorHex: deal.color_hex,
  }));

  const deliveriesSelect = "id, media_url, media_type, image_urls, brand, model, color, color_hex";

  const { data: deliveryVideosData } = await supabase
    .from("deliveries")
    .select(deliveriesSelect)
    .eq("is_published", true)
    .eq("media_type", "video")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: deliveryPhotosData } = await supabase
    .from("deliveries")
    .select(deliveriesSelect)
    .eq("is_published", true)
    .eq("media_type", "image")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(20);

  const mapDelivery = (delivery: {
    id: string;
    media_url: string;
    media_type: "image" | "video";
    image_urls: string[] | null;
    brand: string | null;
    model: string | null;
    color: string | null;
    color_hex: string | null;
  }): Delivery => ({
    id: delivery.id,
    mediaUrl: delivery.media_url,
    mediaType: delivery.media_type,
    imageUrls: delivery.image_urls,
    brand: delivery.brand,
    model: delivery.model,
    color: delivery.color,
    colorHex: delivery.color_hex,
  });

  const deliveryVideos: Delivery[] = (deliveryVideosData ?? []).map(mapDelivery);
  const deliveryPhotos: Delivery[] = (deliveryPhotosData ?? []).map(mapDelivery);

  const { data: founderData } = await supabase
    .from("founder_profile")
    .select("name, title, message, photo_url")
    .eq("id", "main")
    .maybeSingle();

  const founder = founderData
    ? {
        name: founderData.name,
        title: founderData.title,
        message: founderData.message,
        photoUrl: founderData.photo_url,
      }
    : null;

  const { data: testimonialsData } = await supabase
    .from("testimonials")
    .select("id, customer_name, photo_url, message")
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(12);

  const testimonials = (testimonialsData ?? []).map((testimonial) => ({
    id: testimonial.id,
    customerName: testimonial.customer_name,
    photoUrl: testimonial.photo_url,
    message: testimonial.message,
  }));

  // Every section below takes up one full device screen (100dvh —
  // the "dynamic" viewport unit, which correctly accounts for
  // mobile browser chrome showing/hiding), and its content starts
  // near the top so the heading never disappears. pt-24/28/32
  // clears the fixed navbar; dvh adapts automatically to any
  // screen size.
  const sectionClass =
    "flex min-h-[100dvh] flex-col justify-start pb-12 pt-24 sm:pt-28 lg:pt-32";

  // Collection, Live Deals, and Deliveries size to their own content
  // instead of forcing min-h-[100dvh] — the carousel's height varies
  // a lot (1 item vs. 5, video vs. photo), and stretching every
  // section to a full screen regardless left a huge dead gap below
  // the card on short sections, especially on mobile. A single
  // symmetric py-* scale (the same top/bottom rhythm most marketing
  // sites use for stacked sections) keeps consistent breathing room
  // between sections at every screen size.
  const carouselSectionClass = "flex flex-col justify-start py-16 sm:py-20 lg:py-24";

  return (
    <main className="min-h-screen bg-black">
      <JsonLd data={autoDealerJsonLd()} />

      <Navbar />

      <Hero desktopImages={desktopImages} mobileImages={mobileImages} />

      {/* Collection, Live Deals, and Deliveries each render their
          own full <section> (heading + carousel + color-reactive
          background) — see their component files. */}
      <CollectionCarousel cars={cars} sectionClass={carouselSectionClass} />

      <LiveDealsStrip deals={deals} sectionClass={carouselSectionClass} />

      <DeliveriesGallery
        videos={deliveryVideos}
        photos={deliveryPhotos}
        sectionClass={carouselSectionClass}
      />

      {/* =========================================================
          ABOUT
          ========================================================= */}
      <section
        id="about"
        className={`scroll-mt-0 bg-[#0b0b0b] ${sectionClass}`}
      >
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">
          <AboutStats />
          <FounderSection founder={founder} />
        </div>
      </section>

      {/* =========================================================
          TESTIMONIALS
          ========================================================= */}
      {testimonials.length > 0 && (
        <section
          id="testimonials"
          className={`scroll-mt-0 bg-black ${sectionClass}`}
        >
          <TestimonialsSection testimonials={testimonials} />
        </section>
      )}

      {/* =========================================================
          CONTACT
          ========================================================= */}
      <section
        id="contact"
        className={`scroll-mt-0 bg-black ${sectionClass}`}
      >
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-white/40 sm:text-left">
            Start Your Journey
          </p>

          <h2 className="mt-4 text-center font-display text-4xl font-semibold text-white sm:text-left sm:text-5xl">
            Contact AG7 Cars
          </h2>

          <ContactSection />
        </div>
      </section>

      {/* =========================================================
          WHATSAPP COMMUNITY
          ========================================================= */}
      <section
        id="whatsapp-community"
        className="scroll-mt-0 border-t border-white/5 bg-[#0b0b0b] py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center sm:px-10 sm:py-14">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
              <WhatsAppIcon className="h-7 w-7" />
            </span>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">
                Stay Connected
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl">
                Join AG7 Community
              </h2>
              <p className="mx-auto mt-3 max-w-md text-white/60">
                Get first access to new arrivals, live deals, and delivery
                moments — straight on WhatsApp.
              </p>
            </div>

            <a
              href="https://chat.whatsapp.com/ChH3zhtTxNJ0fzMXl6RnUX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 text-sm font-semibold text-black transition hover:bg-[#25D366]/90"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Join on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}