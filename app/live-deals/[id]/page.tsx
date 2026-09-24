import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarImageGallery from "@/components/collection/CarImageGallery";
import { WhatsAppIcon } from "@/components/layout/icons";
import { createClient } from "@/lib/supabase/server";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, vehicleJsonLd } from "@/lib/seo/jsonld";
import { SITE_URL } from "@/lib/seo/site";
import { whatsappEnquiryLink } from "@/lib/whatsapp";

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

const getDealById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data: deal } = await supabase
    .from("live_deals")
    .select(
      "id, brand, name, original_price, deal_price, currency, category, image_urls, color, description"
    )
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return deal;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const deal = await getDealById(id);

  if (!deal) {
    return { title: "Deal Not Found" };
  }

  const hasPricing = deal.original_price !== null && deal.deal_price !== null;
  const discount = hasPricing
    ? Math.round(((deal.original_price! - deal.deal_price!) / deal.original_price!) * 100)
    : null;
  const title = hasPricing
    ? `${deal.brand} ${deal.name} — ${discount}% Off | Live Deal`
    : `${deal.brand} ${deal.name} | Live Deal`;
  const description = (
    hasPricing
      ? `Limited-period deal: ${deal.brand} ${deal.name}${deal.color ? ` in ${deal.color}` : ""} now at ${formatPrice(
          deal.deal_price!,
          deal.currency
        )} (was ${formatPrice(deal.original_price!, deal.currency)}) at AG7 Cars, Indore. Enquire before it's gone.`
      : `Limited-period deal: ${deal.brand} ${deal.name}${deal.color ? ` in ${deal.color}` : ""} at AG7 Cars, Indore — price on request. Enquire before it's gone.`
  ).slice(0, 160);
  const url = `/live-deals/${deal.id}`;
  const image = deal.image_urls?.[0];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function LiveDealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDealById(id);

  if (!deal) {
    notFound();
  }

  const hasPricing = deal.original_price !== null && deal.deal_price !== null;
  const discount = hasPricing
    ? Math.round(((deal.original_price! - deal.deal_price!) / deal.original_price!) * 100)
    : null;
  const savings = hasPricing ? deal.original_price! - deal.deal_price! : 0;
  const dealPriceLabel = hasPricing ? formatPrice(deal.deal_price!, deal.currency) : "Price on Request";

  const dealUrl = `${SITE_URL}/live-deals/${deal.id}`;

  // "Claim This Deal" — unchanged from current production: carries
  // this deal along to the homepage contact form as query params
  // (read there via useSearchParams) so the enquiry email says
  // exactly which deal someone's claiming, not just "an enquiry."
  const enquiryParams = new URLSearchParams({
    deal: deal.id,
    dealLabel: `${deal.brand} ${deal.name} — ${dealPriceLabel}`,
  });
  const enquiryHref = `/?${enquiryParams.toString()}#contact`;

  // "Connect on WhatsApp" — a second, separate option next to Claim
  // This Deal. Pre-fills the deal's name, price, and link plus a
  // blank for the visitor's name only (no question field: this
  // button is for a quick "I'm interested, here's who I am" rather
  // than a full enquiry) so AG7 knows who to follow up with.
  const whatsappHref = whatsappEnquiryLink(
    `Hi AG7 Cars! I'd like to claim this deal: ${deal.brand} ${deal.name} (${dealPriceLabel}).\n${dealUrl}\n\nName :`
  );
  const galleryAlt = `${deal.brand} ${deal.name}${
    deal.color ? ` in ${deal.color}` : ""
  } — live deal at AG7 Cars, Indore`;

  return (
    <main className="min-h-screen bg-black">
      <JsonLd
        data={[
          vehicleJsonLd({
            url: dealUrl,
            name: `${deal.brand} ${deal.name}`,
            brand: deal.brand,
            model: deal.name,
            color: deal.color,
            images: deal.image_urls ?? [],
            description: deal.description,
            price: deal.deal_price,
            priceCurrency: deal.currency,
            isNew: false,
            availability: "InStock",
          }),
          breadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: "Live Deals", url: `${SITE_URL}/live-deals` },
            { name: `${deal.brand} ${deal.name}`, url: dealUrl },
          ]),
        ]}
      />

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
                alt={galleryAlt}
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
                  {hasPricing && (
                    <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                      {discount}% OFF
                    </span>
                  )}
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
                  {hasPricing ? (
                    <>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">You Save</p>
                      <p className="mt-1 break-words font-display text-2xl font-black text-red-400 sm:text-5xl">
                        {formatPrice(savings, deal.currency)}
                      </p>

                      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm text-white/40 line-through sm:text-lg">
                          {formatPrice(deal.original_price!, deal.currency)}
                        </span>
                        <span className="text-lg font-bold text-white sm:text-3xl">
                          {dealPriceLabel}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="break-words font-display text-2xl font-black text-white sm:text-4xl">
                      Price on Request
                    </p>
                  )}
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

              <div className="mt-10 grid grid-cols-2 gap-3 lg:flex lg:flex-nowrap lg:gap-2">
                <Link
                  href={enquiryHref}
                  className="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-full bg-red-500 px-7 text-sm font-semibold text-white transition hover:bg-red-400 lg:h-10 lg:w-auto lg:shrink-0 lg:px-4 lg:text-xs"
                >
                  Claim This Deal
                </Link>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#25D366] px-7 text-sm font-semibold text-black transition hover:bg-[#25D366]/90 lg:h-10 lg:w-auto lg:shrink-0 lg:gap-1.5 lg:px-4 lg:text-xs"
                >
                  Chat With Us
                  <WhatsAppIcon className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                </a>
                <Link
                  href="/live-deals"
                  className="col-span-2 inline-flex h-12 w-auto items-center justify-center justify-self-center whitespace-nowrap rounded-full border border-white/20 px-7 text-sm font-semibold text-white transition hover:border-white lg:h-10 lg:shrink-0 lg:px-4 lg:text-xs"
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