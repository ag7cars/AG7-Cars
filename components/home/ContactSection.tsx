"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { WhatsAppIcon } from "@/components/layout/icons";

const contactInfo = [
  {
    label: "Call Us",
    value: "+91 72477 77724",
    href: "tel:+917247777724",
  },
  {
    label: "Email Us",
    value: "info@ag7cars.com",
    href: "mailto:info@ag7cars.com",
  },
  {
    label: "Location",
    value: "Indore, Madhya Pradesh",
    href: undefined,
  },
];

const WHATSAPP_HREF = "https://wa.me/message/YRZISWIS5KV4C1";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30";

const enquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  phone: z.string().trim().min(7, "Enter a valid contact number"),
  city: z.string().trim().min(1, "Enter your city"),
  email: z.string().trim().email("Enter a valid email"),
  message: z.string().trim().min(1, "Tell us what you're looking for"),
});

type EnquiryFormValues = z.infer<typeof enquirySchema>;

type ListingContext = { label: string; url: string };

// The "Enquire Now" (car page) and "Claim This Deal" (live deal page)
// links carry the listing along as query params on this same
// homepage URL — read here so the enquiry (and the email it sends)
// always says exactly which car someone's asking about. Isolated in
// its own component because useSearchParams requires a Suspense
// boundary around whatever reads it.
function ListingContextReader({
  onContext,
}: {
  onContext: (context: ListingContext | null) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const carSlug = searchParams.get("car");
    const carLabel = searchParams.get("carLabel");
    const dealId = searchParams.get("deal");
    const dealLabel = searchParams.get("dealLabel");

    if (carSlug && carLabel) {
      onContext({ label: carLabel, url: `${window.location.origin}/cars/${carSlug}` });
    } else if (dealId && dealLabel) {
      onContext({ label: dealLabel, url: `${window.location.origin}/live-deals/${dealId}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export default function ContactSection() {
  const [intent, setIntent] = useState<"buy" | "sell">("buy");
  const [listing, setListing] = useState<ListingContext | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquirySchema),
  });

  async function onSubmit(values: EnquiryFormValues) {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, intent, listing: listing ?? undefined }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    }
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
      <Suspense fallback={null}>
        <ListingContextReader onContext={setListing} />
      </Suspense>

      <div>
        <p className="max-w-md text-base leading-8 text-white/70 sm:text-lg">
          Have a car in mind, or a question about a listing? Reach
          out — our team responds personally to every enquiry.
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              {contactInfo[0].label}
            </p>
            <a
              href={contactInfo[0].href}
              className="mt-1 block text-lg text-white transition hover:text-white/70"
            >
              {contactInfo[0].value}
            </a>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              WhatsApp
            </p>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message us on WhatsApp"
              className="mt-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-black transition hover:bg-[#25D366]/85"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
          </div>

          {contactInfo.slice(1).map((item) => (
            <div key={item.label}>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                {item.label}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-1 block text-lg text-white transition hover:text-white/70"
                >
                  {item.value}
                </a>
              ) : (
                <p className="mt-1 text-lg text-white">{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        {status === "success" ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="font-display text-2xl font-semibold text-white">
              Thank you!
            </p>
            <p className="mt-2 text-white/60">
              We've received your message and will get back to you shortly.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-6 rounded-full border border-white/20 px-5 py-2 text-sm text-white/70 transition hover:border-white hover:text-white"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" suppressHydrationWarning>
            {listing && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                <span>
                  Enquiring about{" "}
                  <span className="font-semibold text-white">{listing.label}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setListing(null)}
                  aria-label="Remove"
                  className="shrink-0 text-white/40 transition hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="I want to">
              {(["buy", "sell"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={intent === option}
                  onClick={() => setIntent(option)}
                  className={`h-12 rounded-xl border text-sm font-semibold uppercase tracking-wide transition ${
                    intent === option
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {option === "buy" ? "Buy" : "Sell"}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <input
                  type="text"
                  placeholder="Your Name"
                  className={inputClass}
                  suppressHydrationWarning
                  {...register("name")}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Contact Number"
                  className={inputClass}
                  suppressHydrationWarning
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <input
                  type="text"
                  placeholder="City"
                  className={inputClass}
                  suppressHydrationWarning
                  {...register("city")}
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-red-400">{errors.city.message}</p>
                )}
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className={inputClass}
                  suppressHydrationWarning
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <textarea
                rows={4}
                placeholder="Tell us what you're looking for…"
                className={`${inputClass} resize-none`}
                suppressHydrationWarning
                {...register("message")}
              />
              {errors.message && (
                <p className="mt-1 text-xs text-red-400">{errors.message.message}</p>
              )}
            </div>

            {status === "error" && (
              <p className="text-sm text-red-400">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Sending…" : "Send Enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
