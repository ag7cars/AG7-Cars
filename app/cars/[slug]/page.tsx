import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarImageGallery from "@/components/collection/CarImageGallery";
import { createClient } from "@/lib/supabase/server";

const statusStyles: Record<string, { label: string; className: string }> = {
  available: {
    label: "Available",
    className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  },
  booked: {
    label: "Booked",
    className: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  },
  sold: {
    label: "Sold",
    className: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  },
};

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "Price on request";
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

function formatKm(km: number | null) {
  if (km === null) return null;
  if (km === 0) return "Brand New";
  return `${km.toLocaleString("en-IN")} km`;
}

type SpecKey =
  | "category"
  | "manufacturingYear"
  | "year"
  | "ownership"
  | "km"
  | "fuel"
  | "color";

// Small stroke icons for the spec sheet — kept inline since they're
// only used here, one per spec row so the dossier reads like an
// actual printed spec card instead of a plain label/value list.
function SpecIcon({ specKey }: { specKey: SpecKey }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (specKey) {
    case "category":
      return (
        <svg {...common}>
          <path d="M20.59 13.41 12 22 2 12l1.41-8.59A2 2 0 0 1 5.38 2H12a2 2 0 0 1 1.41.59l7.18 7.18a2 2 0 0 1 0 2.82Z" />
          <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "year":
    case "manufacturingYear":
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M16 2.5v4M8 2.5v4M3 9.5h18" />
        </svg>
      );
    case "ownership":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
        </svg>
      );
    case "fuel":
      return (
        <svg {...common}>
          <path d="M5 21V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15" />
          <path d="M3 21h13" />
          <path d="M14 9.5h1.5L18 12v5.5a1.5 1.5 0 0 1-1.5 1.5" />
          <path d="M7.5 8h4" />
        </svg>
      );
    case "km":
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 13 15.2 9" />
          <path d="M12 5v.01M5 13H4.99M19.01 13H19" />
        </svg>
      );
    case "color":
      return (
        <svg {...common}>
          <path d="M12 21a7.5 7.5 0 0 0 7.5-7.5c0-4-3-7-7.5-11.5-4.5 4.5-7.5 7.5-7.5 11.5A7.5 7.5 0 0 0 12 21Z" />
        </svg>
      );
  }
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: car } = await supabase
    .from("cars")
    .select(
      "id, slug, brand, name, price, currency, status, image_urls, year, manufacturing_year, ownership, fuel, km_driven, category, color, description"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!car) {
    notFound();
  }

  const status = statusStyles[car.status] ?? statusStyles.available;
  const km = formatKm(car.km_driven);

  // Carries this car along to the homepage contact form as query
  // params (read there via useSearchParams) so the enquiry email says
  // exactly which car someone's asking about, not just "an enquiry."
  const enquiryParams = new URLSearchParams({
    car: car.slug,
    carLabel: `${car.brand} ${car.name} — ${formatPrice(car.price, car.currency)}`,
  });
  const enquiryHref = `/?${enquiryParams.toString()}#contact`;

  // Fixed order per the dealership's own spec-sheet convention —
  // everything else (body type, engine, options list, etc.) goes in
  // the free-text Description instead of its own row here.
  const specs: { key: SpecKey; label: string; value: string }[] = [
    { key: "category", label: "Category", value: car.category },
    car.manufacturing_year
      ? { key: "manufacturingYear", label: "Manufacturing Year", value: String(car.manufacturing_year) }
      : null,
    car.year ? { key: "year", label: "Registration Year", value: String(car.year) } : null,
    car.ownership ? { key: "ownership", label: "Ownership", value: car.ownership } : null,
    km ? { key: "km", label: "KMS Driven", value: km } : null,
    car.fuel ? { key: "fuel", label: "Fuel", value: car.fuel } : null,
    car.color ? { key: "color", label: "Color", value: car.color } : null,
  ].filter((s): s is { key: SpecKey; label: string; value: string } => s !== null);

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <div className="pt-24 sm:pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12 xl:px-16">
          <Link
            href="/cars"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to Collection
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            {/* ============ GALLERY ============ */}
            <div className="min-w-0">
              <CarImageGallery
                images={car.image_urls ?? []}
                alt={`${car.brand} ${car.name}`}
                thumbnails
              />
            </div>

            {/* ============ DOSSIER ============ */}
            <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">{car.brand}</p>

                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                >
                  {status.label}
                </div>
              </div>

              <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
                {car.name}
              </h1>

              <p className="mt-3 text-2xl font-semibold text-white">
                {formatPrice(car.price, car.currency)}
              </p>

              {/* Spec sheet — an actual card grid instead of a plain
                  label/value list, each row carrying its own icon so
                  it reads like a printed dossier rather than a form. */}
              <div className="mt-8 grid grid-cols-2 gap-2 sm:gap-3">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/60">
                      <SpecIcon specKey={spec.key} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                        {spec.label}
                      </p>
                      <p className="mt-0.5 text-sm font-medium leading-snug text-white">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {car.description && (
                <div className="mt-8 border-t border-white/10 pt-6">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-white/40">
                    About This Car
                  </p>
                  <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-white/70">
                    {car.description}
                  </p>
                </div>
              )}

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href={enquiryHref}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Enquire Now
                </Link>
                <Link
                  href="/cars"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-7 text-sm font-semibold text-white transition hover:border-white"
                >
                  Back to Collection
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
