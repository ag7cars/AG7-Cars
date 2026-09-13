"use client";

import { useState } from "react";
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

export default function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [intent, setIntent] = useState<"buy" | "sell">("buy");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Note: this doesn't send anywhere yet — it's a UI placeholder.
    // Wire this up to an API route / email service when ready.
    setSubmitted(true);
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
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
        {submitted ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="font-display text-2xl font-semibold text-white">
              Thank you!
            </p>
            <p className="mt-2 text-white/60">
              We've received your message and will get back to you shortly.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-6 rounded-full border border-white/20 px-5 py-2 text-sm text-white/70 transition hover:border-white hover:text-white"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
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
              <input
                type="text"
                required
                placeholder="Your Name"
                className={inputClass}
                suppressHydrationWarning
              />
              <input
                type="tel"
                required
                placeholder="Contact Number"
                className={inputClass}
                suppressHydrationWarning
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                required
                placeholder="City"
                className={inputClass}
                suppressHydrationWarning
              />
              <input
                type="email"
                required
                placeholder="Email"
                className={inputClass}
                suppressHydrationWarning
              />
            </div>

            <textarea
              required
              rows={4}
              placeholder="Tell us what you're looking for…"
              className={`${inputClass} resize-none`}
              suppressHydrationWarning
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Send Enquiry
            </button>
          </form>
        )}
      </div>
    </div>
  );
}