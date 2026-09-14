import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LiveDealsBrowser, {
  type BrowseDeal,
} from "@/components/live-deals/LiveDealsBrowser";
import { createClient } from "@/lib/supabase/server";

export default async function LiveDealsPage() {
  const supabase = await createClient();

  const { data: dealsData } = await supabase
    .from("live_deals")
    .select("id, brand, name, original_price, deal_price, currency, category, image_urls")
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const deals: BrowseDeal[] = (dealsData ?? []).map((deal) => ({
    id: deal.id,
    brand: deal.brand,
    name: deal.name,
    originalPrice: deal.original_price,
    dealPrice: deal.deal_price,
    currency: deal.currency,
    category: deal.category,
    image: deal.image_urls?.[0] ?? null,
  }));

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <div className="pt-24 sm:pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12 xl:px-16">
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-red-300 sm:text-left">
            Live Deals
          </p>

          <h1 className="mt-4 text-center font-display text-4xl font-semibold text-white sm:text-left sm:text-5xl">
            Limited-Time Offers
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-center text-white/60 sm:mx-0 sm:text-left">
            Every active deal at AG7 Cars — grab one before it's gone.
          </p>

          <div className="mt-10">
            <LiveDealsBrowser deals={deals} />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}