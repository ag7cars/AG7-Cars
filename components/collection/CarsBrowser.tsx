"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type BrowseCar = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  price: number | null;
  currency: string;
  status: "available" | "booked" | "sold";
  image: string | null;
  year: number | null;
  manufacturingYear: number | null;
  registration: string | null;
  ownership: string | null;
  fuel: string | null;
  kmDriven: number | null;
  bodyType: string | null;
  category: "Pre-Owned" | "New" | "Demo";
};

const statusStyles: Record<
  BrowseCar["status"],
  { label: string; dot: string; badge: string }
> = {
  available: {
    label: "Available",
    dot: "bg-emerald-400",
    badge: "border-emerald-400/40 bg-black/70 text-emerald-300",
  },
  booked: {
    label: "Booked",
    dot: "bg-amber-400",
    badge: "border-amber-400/40 bg-black/70 text-amber-300",
  },
  sold: {
    label: "Sold",
    dot: "bg-rose-400",
    badge: "border-rose-400/40 bg-black/70 text-rose-300",
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
  return `${km.toLocaleString("en-IN")} Kms`;
}

// Only the state + RTO code is shown publicly (e.g. "MP 09"), never
// the full plate — admins sometimes type extra notes after it (a
// series/number, a parenthetical), which this trims off rather than
// showing the raw value verbatim.
function formatRegistration(value: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^([A-Za-z]{2})\s*-?\s*(\d{1,2})/);
  if (!match) return value.trim();
  const [, state, code] = match;
  return `${state.toUpperCase()} ${code.padStart(2, "0")}`;
}

/* ============================================================
   FILTER DEFINITIONS
   ============================================================ */

const PRICE_RANGES = [
  { id: "lt35l", label: "Less than 35L", test: (p: number) => p < 3_500_000 },
  { id: "35l-50l", label: "35L to 50L", test: (p: number) => p >= 3_500_000 && p < 5_000_000 },
  { id: "50l-1cr", label: "50L to 1 Cr", test: (p: number) => p >= 5_000_000 && p < 10_000_000 },
  { id: "1cr-1.5cr", label: "1 Cr to 1.5 Cr", test: (p: number) => p >= 10_000_000 && p < 15_000_000 },
  { id: "1.5cr-2.5cr", label: "1.5 Cr to 2.5 Cr", test: (p: number) => p >= 15_000_000 && p < 25_000_000 },
  { id: "gt2.5cr", label: "2.5 Cr & Above", test: (p: number) => p >= 25_000_000 },
] as const;

// Shared by both year filters below — every bucket except
// "Unregistered" (registration-only) tests a plain number; that one
// special-cases a null year (never manufactured-year, since a car is
// always manufactured before it reaches the lot).
const YEAR_BUCKETS = [
  { id: "before2000", label: "Before 2000", test: (y: number) => y < 2000 },
  { id: "2000-2010", label: "2000 - 2010", test: (y: number) => y >= 2000 && y <= 2010 },
  { id: "2011-2015", label: "2011 - 2015", test: (y: number) => y >= 2011 && y <= 2015 },
  { id: "2016-2020", label: "2016 - 2020", test: (y: number) => y >= 2016 && y <= 2020 },
  { id: "2021-2025", label: "2021 - 2025", test: (y: number) => y >= 2021 && y <= 2025 },
  { id: "2026-above", label: "2026 & Above", test: (y: number) => y >= 2026 },
] as const;

const REGISTRATION_YEAR_OPTIONS = [
  { id: "unregistered", label: "Unregistered" },
  ...YEAR_BUCKETS.map((b) => ({ id: b.id, label: b.label })),
];

// Fixed, complete list — matches the Body Type options in the admin
// form — so every option always shows, even before any car of that
// type has been added yet.
const BODY_TYPES = [
  "Convertible",
  "Coupe",
  "Hatchback",
  "Pickup Truck",
  "Sedan",
  "Sports Car",
  "Supercar",
  "SUV",
  "Van / MPV",
  "Wagon",
] as const;

const KM_RANGES = [
  {
    id: "brand-new",
    label: "Brand New",
    test: (car: BrowseCar) => car.kmDriven === 0,
  },
  {
    id: "demo",
    label: "Demo Cars",
    test: (car: BrowseCar) => car.category === "Demo",
  },
  {
    id: "0-1k",
    label: "0 - 1000 kms",
    test: (car: BrowseCar) => (car.kmDriven ?? -1) > 0 && (car.kmDriven ?? 0) <= 1_000,
  },
  {
    id: "1k-5k",
    label: "1000 kms - 5000 kms",
    test: (car: BrowseCar) => (car.kmDriven ?? -1) > 1_000 && (car.kmDriven ?? 0) <= 5_000,
  },
  {
    id: "5k-15k",
    label: "5000 - 15000 kms",
    test: (car: BrowseCar) => (car.kmDriven ?? -1) > 5_000 && (car.kmDriven ?? 0) <= 15_000,
  },
  {
    id: "15k-25k",
    label: "15000 - 25000 kms",
    test: (car: BrowseCar) => (car.kmDriven ?? -1) > 15_000 && (car.kmDriven ?? 0) <= 25_000,
  },
  {
    id: "25k-50k",
    label: "25000 - 50000 kms",
    test: (car: BrowseCar) => (car.kmDriven ?? -1) > 25_000 && (car.kmDriven ?? 0) <= 50_000,
  },
  {
    id: "50k-plus",
    label: "50000 kms & Above",
    test: (car: BrowseCar) => (car.kmDriven ?? 0) > 50_000,
  },
] as const;

const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric"] as const;

/* ============================================================
   ACCORDION FILTER SECTION
   ============================================================ */

function FilterSection({
  title,
  options,
  selected,
  onToggle,
  defaultOpen = true,
}: {
  title: string;
  options: { id: string; label: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (options.length === 0) return null;

  return (
    <div className="border-b border-white/10 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-[0.15em] text-white">
          {title}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`shrink-0 text-white/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="mt-3 space-y-1.5">
          {options.map((option) => {
            const isSelected = selected.has(option.id);

            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition ${
                  isSelected
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(option.id)}
                  className="sr-only"
                />
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                    isSelected
                      ? "border-white bg-white"
                      : "border-white/30 bg-white/5"
                  }`}
                >
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                {option.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TILT CARD — subtly rotates toward the cursor, like a showroom
   plaque catching the light. Pure CSS transform driven by pointer
   position; no-op on touch (there's no hover to drive it from).
   ============================================================ */

function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const maxTilt = 9;

    setStyle({
      transform: `perspective(900px) rotateX(${(0.5 - py) * maxTilt * 2}deg) rotateY(${(px - 0.5) * maxTilt * 2}deg) scale3d(1.03, 1.03, 1.03)`,
      transition: "transform 0.1s ease-out",
    });
  }

  function handleMouseLeave() {
    setStyle({
      transform: "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transformStyle: "preserve-3d" }}
      className="h-full [will-change:transform]"
    >
      {children}
    </div>
  );
}

/* ============================================================
   CARD — same visual language as the homepage AG7 Collection cards:
   a full-bleed photo with brand/name/status and the spec grid laid
   over a top gradient, price over a bottom gradient. Kept in sync
   with CarCardFace in components/home/CollectionCarousel.tsx.
   ============================================================ */

type CardProps = {
  car: BrowseCar;
  km: string | null;
};

function CardGauge({ car, km }: CardProps) {
  const status = statusStyles[car.status];

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/5 bg-white/[0.06] shadow-2xl">
      {car.image ? (
        <Image
          src={car.image}
          alt={`${car.brand} ${car.name}`}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 46vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/[0.02]">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">No Image</span>
        </div>
      )}

      {/* Two gradients — a taller, darker one at the top carries the
          brand, name, status and spec grid; a smaller one at the
          bottom carries just the price. */}
      <div className="absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b from-black/95 via-black/70 via-55% to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 to-transparent" />

      <div className="absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-1.5">
          <p className="min-w-0 truncate text-[8px] uppercase tracking-[0.08em] text-white/60 sm:text-[10px] sm:tracking-[0.15em]">
            {car.brand}
          </p>

          <div
            className={`flex shrink-0 items-center gap-0.5 rounded-full border ${status.badge} px-1 py-0.5 text-[7px] font-semibold shadow-lg backdrop-blur-md sm:gap-1 sm:px-1.5 sm:text-[9px]`}
          >
            <span className={`h-1 w-1 shrink-0 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>

        <h3 className="truncate font-display text-sm font-semibold leading-snug text-white sm:text-base">
          {car.name}
        </h3>

        {/* Fixed 6-slot grid — same position for every field on every
            card, regardless of missing data (shown as "—"), so cards
            line up with each other instead of each wrapping to a
            different width/line count. */}
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-white/75 sm:text-[10.5px]">
          <span>Mfg: {car.manufacturingYear ?? "—"}</span>
          <span className="text-right">Reg: {car.year ?? "—"}</span>
          <span>{car.ownership ?? "—"}</span>
          <span className="text-right">{formatRegistration(car.registration) ?? "—"}</span>
          <span>{km ?? "—"}</span>
          <span className="text-right">{car.fuel ?? "—"}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        {/* Sold cars no longer show a price — it's off the market, so
            quoting a figure for it doesn't make sense anymore. */}
        {car.status !== "sold" && (
          <p className="text-xs font-semibold text-white sm:text-sm">{formatPrice(car.price, car.currency)}</p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN BROWSER
   ============================================================ */

export default function CarsBrowser({ cars }: { cars: BrowseCar[] }) {
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedPrices, setSelectedPrices] = useState<Set<string>>(new Set());
  const [selectedRegYears, setSelectedRegYears] = useState<Set<string>>(new Set());
  const [selectedMfgYears, setSelectedMfgYears] = useState<Set<string>>(new Set());
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<Set<string>>(new Set());
  const [selectedKm, setSelectedKm] = useState<Set<string>>(new Set());
  const [selectedFuels, setSelectedFuels] = useState<Set<string>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const brandOptions = useMemo(() => {
    const brands = Array.from(new Set(cars.map((c) => c.brand))).sort();
    return brands.map((b) => ({ id: b, label: b }));
  }, [cars]);

  const bodyTypeOptions = useMemo(
    () => BODY_TYPES.map((t) => ({ id: t, label: t })),
    []
  );

  const fuelOptions = useMemo(
    () => FUEL_TYPES.map((f) => ({ id: f, label: f })),
    []
  );

  function toggle(setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setFn((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      if (selectedBrands.size > 0 && !selectedBrands.has(car.brand)) return false;

      if (selectedPrices.size > 0) {
        const price = car.price;
        const matches = price !== null && PRICE_RANGES.some(
          (r) => selectedPrices.has(r.id) && r.test(price)
        );
        if (!matches) return false;
      }

      if (selectedRegYears.size > 0) {
        const year = car.year;
        const matches =
          (year === null && selectedRegYears.has("unregistered")) ||
          (year !== null &&
            YEAR_BUCKETS.some((r) => selectedRegYears.has(r.id) && r.test(year)));
        if (!matches) return false;
      }

      if (selectedMfgYears.size > 0) {
        const year = car.manufacturingYear;
        const matches = year !== null && YEAR_BUCKETS.some(
          (r) => selectedMfgYears.has(r.id) && r.test(year)
        );
        if (!matches) return false;
      }

      if (selectedBodyTypes.size > 0) {
        if (!car.bodyType || !selectedBodyTypes.has(car.bodyType)) return false;
      }

      if (selectedKm.size > 0) {
        const matches = KM_RANGES.some((r) => selectedKm.has(r.id) && r.test(car));
        if (!matches) return false;
      }

      if (selectedFuels.size > 0) {
        if (!car.fuel || !selectedFuels.has(car.fuel)) return false;
      }

      return true;
    });
  }, [
    cars,
    selectedBrands,
    selectedPrices,
    selectedRegYears,
    selectedMfgYears,
    selectedBodyTypes,
    selectedKm,
    selectedFuels,
  ]);

  const activeFilterCount =
    selectedBrands.size +
    selectedPrices.size +
    selectedRegYears.size +
    selectedMfgYears.size +
    selectedBodyTypes.size +
    selectedKm.size +
    selectedFuels.size;

  function clearAll() {
    setSelectedBrands(new Set());
    setSelectedPrices(new Set());
    setSelectedRegYears(new Set());
    setSelectedMfgYears(new Set());
    setSelectedBodyTypes(new Set());
    setSelectedKm(new Set());
    setSelectedFuels(new Set());
  }

  const filterSections = (
    <>
      <FilterSection
        title="Brand"
        options={brandOptions}
        selected={selectedBrands}
        onToggle={(id) => toggle(setSelectedBrands, id)}
      />

      <FilterSection
        title="Price Range"
        options={PRICE_RANGES.map((r) => ({ id: r.id, label: r.label }))}
        selected={selectedPrices}
        onToggle={(id) => toggle(setSelectedPrices, id)}
      />

      <FilterSection
        title="Manufacturing Year"
        options={YEAR_BUCKETS.map((r) => ({ id: r.id, label: r.label }))}
        selected={selectedMfgYears}
        onToggle={(id) => toggle(setSelectedMfgYears, id)}
      />

      <FilterSection
        title="Registration Year"
        options={REGISTRATION_YEAR_OPTIONS}
        selected={selectedRegYears}
        onToggle={(id) => toggle(setSelectedRegYears, id)}
      />

      <FilterSection
        title="Body Type"
        options={bodyTypeOptions}
        selected={selectedBodyTypes}
        onToggle={(id) => toggle(setSelectedBodyTypes, id)}
      />

      <FilterSection
        title="KM Driven"
        options={KM_RANGES.map((r) => ({ id: r.id, label: r.label }))}
        selected={selectedKm}
        onToggle={(id) => toggle(setSelectedKm, id)}
      />

      <FilterSection
        title="Fuel"
        options={fuelOptions}
        selected={selectedFuels}
        onToggle={(id) => toggle(setSelectedFuels, id)}
      />
    </>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
      {/* =====================================================
          DESKTOP FILTERS — always visible sidebar
          ===================================================== */}
      <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
            Filters
          </h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-white/50 underline transition hover:text-white"
            >
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="mt-2">{filterSections}</div>
      </aside>

      {/* =====================================================
          MOBILE FILTER BUTTON + DRAWER
          ===================================================== */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 3.5h12M4.5 8h7M7 12.5h2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
              {activeFilterCount}
            </span>
          )}
        </button>

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setMobileFiltersOpen(false)}
              className="absolute inset-0 bg-black/70"
            />

            <div className="relative flex h-full w-[85vw] max-w-sm flex-col bg-[#0a0a0a] p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-3 self-start text-xs text-white/50 underline transition hover:text-white"
                >
                  Clear all ({activeFilterCount})
                </button>
              )}

              <div className="mt-2 flex-1 overflow-y-auto">{filterSections}</div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black"
              >
                Show {filteredCars.length} car{filteredCars.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          RESULTS
          ===================================================== */}
      <div>
        <p className="mb-6 mt-6 text-sm text-white/50 lg:mt-0">
          {filteredCars.length} car{filteredCars.length === 1 ? "" : "s"} found
        </p>

        {filteredCars.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-white/[0.03] px-8 py-20 text-center">
            <p className="text-white/50">
              No cars match these filters. Try clearing some of them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCars.map((car) => {
              const km = formatKm(car.kmDriven);

              return (
                <TiltCard key={car.id}>
                  <Link href={`/cars/${car.slug}`} className="relative block h-full">
                    <CardGauge car={car} km={km} />
                  </Link>
                </TiltCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}