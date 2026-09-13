"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const liveDealSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required"),
  name: z.string().trim().min(1, "Name is required"),
  original_price: z.number({ error: "Original price is required" }).positive("Enter a valid price"),
  deal_price: z.number({ error: "Deal price is required" }).positive("Enter a valid price"),
  currency: z.string().trim().min(1),
  description: z.string().optional(),
});

type LiveDealFormValues = z.infer<typeof liveDealSchema>;

export default function AddLiveDealForm() {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LiveDealFormValues>({
    resolver: zodResolver(liveDealSchema),

    defaultValues: {
      currency: "INR",
    },
  });

  const originalPrice = watch("original_price");
  const dealPrice = watch("deal_price");

  const discountPercent =
    originalPrice && dealPrice && originalPrice > dealPrice
      ? Math.round(((originalPrice - dealPrice) / originalPrice) * 100)
      : null;

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  function addImages(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selected.length === 0) return;

    setImages((current) => {
      const combined = [...current, ...selected];

      if (combined.length > 10) {
        setMessage("You can upload a maximum of 10 images.");
        return combined.slice(0, 10);
      }

      setMessage("");
      return combined;
    });
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const onSubmit: SubmitHandler<LiveDealFormValues> = async (values) => {
    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("deal", JSON.stringify(values));
      images.forEach((image) => {
        formData.append("images", image);
      });

      const response = await fetch("/api/admin/live-deals", {
        method: "POST",
        body: formData,
      });

      const result = await safeParseJson(response);

      if (!response.ok) {
        const detailText = result.details
          ? ` (${JSON.stringify(result.details.fieldErrors ?? result.details)})`
          : "";
        throw new Error(
          (result.error || `Something went wrong (status ${response.status}).`) + detailText
        );
      }

      setMessage("Live deal successfully published.");

      reset({ currency: "INR" });
      setImages([]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8"
    >

      {/* =====================================================
          DEAL DETAILS
          ===================================================== */}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">

        <h2 className="text-xl font-semibold">
          Deal Details
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">

          <Field
            label="Brand"
            error={errors.brand?.message}
          >
            <input
              {...register("brand")}
              placeholder="Lamborghini"
              className={inputClass}
            />
          </Field>

          <Field
            label="Name"
            error={errors.name?.message}
          >
            <input
              {...register("name")}
              placeholder="Huracán EVO"
              className={inputClass}
            />
          </Field>

          <Field
            label="Currency"
            error={errors.currency?.message}
          >
            <select
              {...register("currency")}
              className={selectClass}
              style={{ colorScheme: "dark" }}
            >
              <option value="INR" style={optionStyle}>INR</option>
              <option value="USD" style={optionStyle}>USD</option>
              <option value="AED" style={optionStyle}>AED</option>
              <option value="GBP" style={optionStyle}>GBP</option>
              <option value="EUR" style={optionStyle}>EUR</option>
            </select>
          </Field>

          <Field
            label="Original Price"
            error={errors.original_price?.message}
          >
            <input
              type="number"
              step="0.01"
              {...register("original_price", { valueAsNumber: true })}
              placeholder="9500000"
              className={inputClass}
            />
          </Field>

          <Field
            label="Deal Price"
            error={errors.deal_price?.message}
          >
            <input
              type="number"
              step="0.01"
              {...register("deal_price", { valueAsNumber: true })}
              placeholder="8200000"
              className={inputClass}
            />
          </Field>

        </div>

        {discountPercent !== null && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            {discountPercent}% OFF — customers save on this deal
          </p>
        )}

        <div className="mt-5">
          <Field
            label="Description"
            error={errors.description?.message}
          >
            <textarea
              {...register("description")}
              rows={4}
              placeholder="What makes this a great deal — condition, urgency, highlights…"
              className={`${inputClass} min-h-[120px] resize-y py-3`}
            />
          </Field>
        </div>

      </section>


      {/* =====================================================
          IMAGES
          ===================================================== */}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">

        <h2 className="text-xl font-semibold">
          Deal Images
        </h2>

        <p className="mt-2 text-sm text-white/50">
          Add up to 10 photographs. They will be saved and shown in
          the exact order below — the first one is used as the
          cover image on the landing page.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={addImages}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={images.length >= 10}
          className="mt-6 flex w-full items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {images.length === 0
            ? "Add Images"
            : `Add More Images (${images.length}/10)`}
        </button>

        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {images.map((image, index) => (
              <div
                key={`${image.name}-${image.lastModified}-${index}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
              >
                <div className="relative aspect-square w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previews[index]}
                    alt={`Deal photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />

                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-black">
                      Cover
                    </span>
                  )}

                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1 border-t border-white/10 bg-black/40 p-1.5">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    aria-label="Move image earlier"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label="Remove image"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-red-500/20 hover:text-red-300"
                  >
                    ✕
                  </button>

                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label="Move image later"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>


      {/* =====================================================
          MESSAGE
          ===================================================== */}

      {message && (
        <p
          className={`text-sm ${
            message.includes("successfully")
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}


      {/* =====================================================
          SUBMIT
          ===================================================== */}

      <button
        type="submit"
        disabled={saving}
        className="h-13 w-full rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Publishing…" : "Publish Live Deal"}
      </button>

    </form>
  );
}


/* ============================================================
   FIELD WRAPPER
   ============================================================ */

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">
        {label}
      </label>

      {children}

      {error && (
        <p className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}


/* ============================================================
   INPUT STYLE
   ============================================================ */

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30";

const selectClass =
  "h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition focus:border-white/30";

const optionStyle = { backgroundColor: "#000000", color: "#ffffff" };

/* ============================================================
   SAFE RESPONSE PARSING
   The server should always return JSON, but if something
   upstream (a proxy, a timeout, an unhandled crash) ever
   returns HTML or plain text instead, calling response.json()
   directly throws a confusing "Unexpected token" error. Read
   the body as text first and only parse it if it looks like
   JSON, so failures always surface a readable message.
   ============================================================ */
async function safeParseJson(
  response: Response
): Promise<{ error?: string; id?: string; details?: { fieldErrors?: Record<string, string[]> } }> {
  const text = await response.text();

  if (!text) {
    return { error: `Empty response from server (status ${response.status}).` };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `Unexpected response from server (status ${response.status}): ${text.slice(0, 200)}`,
    };
  }
}
