import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import { getYouTubeVideoId, isYouTubeUrl, toYouTubeEmbedUrl } from "@/lib/youtube";
import { isInstagramUrl } from "@/lib/instagram";
import InstagramEmbed from "@/components/InstagramEmbed";
import DeliveryPhotoGallery from "@/components/deliveries/DeliveryPhotoGallery";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: delivery } = await supabase
    .from("deliveries")
    .select("id, media_url, media_type, image_urls, brand, model, color, caption")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (!delivery) {
    notFound();
  }

  const title = [delivery.brand, delivery.model].filter(Boolean).join(" ") || "AG7 Cars Delivery";

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <div className="pt-24 sm:pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-2xl px-5 pb-20 sm:px-8 lg:px-12 xl:px-16">
          <Link
            href="/deliveries"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to AG7 Deliveries
          </Link>

          {/* A single enlarged Polaroid instead of a listing hero —
              this page is a kept moment, not something for sale, so
              it reads as a keepsake photo rather than inventory. */}
          <div className="relative mx-auto w-full max-w-md -rotate-1 rounded-sm bg-[#f4efe4] p-3 pb-8 shadow-2xl ring-1 ring-black/5 sm:p-4 sm:pb-12">
            <span className="absolute left-1/2 top-0 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-md ring-2 ring-red-300/50" />

            <div
              className={`relative w-full bg-black ${
                delivery.media_type === "video" && isInstagramUrl(delivery.media_url)
                  ? ""
                  : "aspect-[3/4] overflow-hidden"
              }`}
            >
              {delivery.media_type === "video" ? (
                isYouTubeUrl(delivery.media_url) ? (
                  <iframe
                    src={toYouTubeEmbedUrl(getYouTubeVideoId(delivery.media_url)!)}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : isInstagramUrl(delivery.media_url) ? (
                  <InstagramEmbed url={delivery.media_url} />
                ) : (
                  <video
                    src={delivery.media_url}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <DeliveryPhotoGallery
                  images={delivery.image_urls?.length ? delivery.image_urls : [delivery.media_url]}
                  alt={title}
                />
              )}
            </div>

            <div className="px-3 pt-4 text-center sm:px-4 sm:pt-5">
              {delivery.brand && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">
                  {delivery.brand}
                </p>
              )}
              {delivery.model && (
                <h1 className="mt-1 font-display text-xl font-bold text-black/85 sm:text-2xl">
                  {delivery.model}
                </h1>
              )}
              {delivery.color && (
                <p className="mt-1 text-xs text-black/45">{delivery.color}</p>
              )}
              {delivery.caption && (
                <p className="mt-3 whitespace-pre-wrap text-sm italic leading-6 text-black/60">
                  {delivery.caption}
                </p>
              )}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-center">
            <p className="w-full text-sm text-white/50">
              Want a delivery moment like this one?
            </p>
            <Link
              href="/#contact"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Enquire Now
            </Link>
            <Link
              href="/deliveries"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-7 text-sm font-semibold text-white transition hover:border-white"
            >
              Back to AG7 Deliveries
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}