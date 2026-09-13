import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DeliveriesBrowser, {
  type BrowseDelivery,
} from "@/components/deliveries/DeliveriesBrowser";
import { createClient } from "@/lib/supabase/server";

export default async function DeliveriesPage() {
  const supabase = await createClient();

  const { data: deliveriesData } = await supabase
    .from("deliveries")
    .select("id, media_url, media_type, brand, model")
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const deliveries: BrowseDelivery[] = (deliveriesData ?? []).map((delivery) => ({
    id: delivery.id,
    mediaUrl: delivery.media_url,
    mediaType: delivery.media_type,
    brand: delivery.brand,
    model: delivery.model,
  }));

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <div className="pt-24 sm:pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12 xl:px-16">
          <h1 className="text-center font-display text-4xl font-semibold text-white sm:text-left sm:text-5xl">
            AG7 Deliveries
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-center text-white/60 sm:mx-0 sm:text-left">
            Every delivery moment shared by AG7 Cars.
          </p>

          <div className="mt-10">
            <DeliveriesBrowser deliveries={deliveries} />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}