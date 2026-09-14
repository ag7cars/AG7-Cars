import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarImageGallery from "@/components/collection/CarImageGallery";
import { createClient } from "@/lib/supabase/server";

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString()}`;
  }
}

export default async function LiveDealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deal } = await supabase
    .from("live_deals")
    .select(
      "id, brand, name, original_price, deal_price, currency, category, image_urls, color, description"
    )
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (!deal) {
    notFound();
  }

  const discount = Math.round(
    ((deal.original_price - deal.deal_price) / deal.original_price) * 100
  );
  const savings = deal.original_price - deal.deal_price;

  // Carries this deal along to the homepage contact form as query
  // params (read there via useSearchParams) so the enquiry email says
  // exactly which deal someone's claiming, not just "an enquiry."
  const enquiryParams = new URLSearchParams({
    deal: deal.id,
    dealLabel: `${deal.brand} ${deal.name} — ${formatPrice(deal.deal_price, deal.currency)}`,
  });
  const enquiryHref = `/?${enquiryParams.toString()}#contact`;

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <div className="pt-24 sm:pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12 xl:px-16">
          <Link
            href="/live-deals"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to Live Deals
          </Link>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="min-w-0">
              <CarImageGallery
                images={deal.image_urls ?? []}
                alt={`${deal.brand} ${deal.name}`}
                thumbnails
              />
            </div>

            {/* A blown-up ticket stub, same language as the deal card
                on the listing page — sharp corners, a punched divider,
                the savings amount as the actual headline instead of
                the car's name. */}
            <div className="min-w-0">
              <div className="overflow-hidden rounded-lg bg-[#0a0a0a] ring-1 ring-red-400/30">
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 sm:px-6 sm:pt-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                    </span>
                    Live Deal
                  </span>
                  <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                    {discount}% OFF
                  </span>
                </div>

                <div className="px-5 pt-4 sm:px-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                    {deal.brand} · {deal.category}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">
                    {deal.name}
                  </h1>
                </div>

                {/* Punched divider */}
                <div className="relative mt-5 h-0 border-t border-dashed border-white/20 sm:mt-6">
                  <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-black" />
                  <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-black" />
                </div>

                <div className="px-5 py-6 sm:px-6 sm:py-7">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">You Save</p>
                  <p className="mt-1 break-words font-display text-2xl font-black text-red-400 sm:text-5xl">
                    {formatPrice(savings, deal.currency)}
                  </p>

                  <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm text-white/40 line-through sm:text-lg">
                      {formatPrice(deal.original_price, deal.currency)}
                    </span>
                    <span className="text-lg font-bold text-white sm:text-3xl">
                      {formatPrice(deal.deal_price, deal.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {deal.description && (
                <p className="mt-8 whitespace-pre-wrap break-words leading-7 text-white/70">
                  {deal.description}
                </p>
              )}

              {deal.color && (
                <div className="mt-6 border-t border-white/10 pt-6">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-white/40">
                    Color
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{deal.color}</p>
                </div>
              )}

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href={enquiryHref}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-red-500 px-7 text-sm font-semibold text-white transition hover:bg-red-400"
                >
                  Claim This Deal
                </Link>
                <Link
                  href="/live-deals"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-7 text-sm font-semibold text-white transition hover:border-white"
                >
                  Back to Live Deals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}