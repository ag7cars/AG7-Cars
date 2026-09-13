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
import ContactSection from "@/components/home/ContactSection";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: carsData } = await supabase
    .from("cars")
    .select("id, slug, brand, name, price, currency, status, image_urls, color, color_hex")
    .eq("is_published", true)
    // Sold and booked cars stay off the homepage teaser carousel —
    // it's meant to showcase what's actually available right now;
    // the full Collection page still lists every status.
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(15);

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
  }));

  const { data: dealsData } = await supabase
    .from("live_deals")
    .select("id, brand, name, original_price, deal_price, currency, image_urls, color, color_hex")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(15);

  const deals: LiveDeal[] = (dealsData ?? []).map((deal) => ({
    id: deal.id,
    brand: deal.brand,
    name: deal.name,
    originalPrice: deal.original_price,
    dealPrice: deal.deal_price,
    currency: deal.currency,
    image: deal.image_urls?.[0] ?? null,
    color: deal.color,
    colorHex: deal.color_hex,
  }));

  const deliveriesSelect = "id, media_url, media_type, brand, model, color, color_hex";

  const { data: deliveryVideosData } = await supabase
    .from("deliveries")
    .select(deliveriesSelect)
    .eq("is_published", true)
    .eq("media_type", "video")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(15);

  const { data: deliveryPhotosData } = await supabase
    .from("deliveries")
    .select(deliveriesSelect)
    .eq("is_published", true)
    .eq("media_type", "image")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(15);

  const mapDelivery = (delivery: {
    id: string;
    media_url: string;
    media_type: "image" | "video";
    brand: string | null;
    model: string | null;
    color: string | null;
    color_hex: string | null;
  }): Delivery => ({
    id: delivery.id,
    mediaUrl: delivery.media_url,
    mediaType: delivery.media_type,
    brand: delivery.brand,
    model: delivery.model,
    color: delivery.color,
    colorHex: delivery.color_hex,
  });

  const deliveryVideos: Delivery[] = (deliveryVideosData ?? []).map(mapDelivery);
  const deliveryPhotos: Delivery[] = (deliveryPhotosData ?? []).map(mapDelivery);

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
      <Navbar />

      <Hero />

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
        </div>
      </section>

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

      <Footer />
    </main>
  );
}