"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const deliverySchema = z.object({
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  caption: z.string().trim().max(500, "Keep the caption under 500 characters").optional(),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

// One delivery entry can hold several photos, same as Collection cars
// and Live Deals — image_urls[0] becomes the cover shown on the
// landing page carousel and the /deliveries grid; the full set shows
// on the entry's own detail page.
export default function AddDeliveryPhotoForm() {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
  });

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
        setMessage("You can add a maximum of 10 photos.");
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

  const onSubmit: SubmitHandler<DeliveryFormValues> = async (values) => {
    if (images.length === 0) {
      setMessage("Please add at least one photo.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("delivery", JSON.stringify({ ...values, mediaKind: "photo" }));
      images.forEach((image) => formData.append("images", image));

      const response = await fetch("/api/admin/deliveries", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      let result: { error?: string; details?: { fieldErrors?: Record<string, string[]> } } = {};
      if (text) {
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error(`Something went wrong (status ${response.status}).`);
        }
      }

      if (!response.ok) {
        const detailText = result.details
          ? ` (${JSON.stringify(result.details.fieldErrors ?? result.details)})`
          : "";
        throw new Error((result.error || `Something went wrong (status ${response.status}).`) + detailText);
      }

      setMessage("Delivery photo entry successfully published.");
      reset({ brand: "", model: "", caption: "" });
      setImages([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* =====================================================
          PHOTOS
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Delivery Photos</h2>

        <p className="mt-2 text-sm text-white/50">
          Add up to 10 photos for this one delivery entry. They&apos;ll show in the order below —
          the first one is the cover shown on the landing page and grid. Use the arrows to
          reorder.
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
          {images.length === 0 ? "Add Photos" : `Add More Photos (${images.length}/10)`}
        </button>

        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {images.map((image, index) => (
              <div
                key={`${image.name}-${image.lastModified}-${index}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-black"
              >
                <div className="relative aspect-[4/5] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previews[index]}
                    alt={`Delivery photo ${index + 1}`}
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
          BRAND & MODEL
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Brand &amp; Model</h2>

        <p className="mt-2 text-sm text-white/50">Shown on the landing page next to the cover photo.</p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Brand" error={errors.brand?.message}>
            <input {...register("brand")} placeholder="Range Rover" className={inputClass} />
          </Field>

          <Field label="Model" error={errors.model?.message}>
            <input {...register("model")} placeholder="Velar 2L HSE" className={inputClass} />
          </Field>
        </div>

        <div className="mt-5">
          <Field label="Caption (optional)" error={errors.caption?.message}>
            <textarea
              {...register("caption")}
              rows={3}
              placeholder="A short caption for this delivery…"
              className={`${inputClass} resize-none py-3`}
            />
          </Field>
        </div>
      </section>

      {/* =====================================================
          MESSAGE
          ===================================================== */}
      {message && (
        <p className={`text-sm ${message.includes("successfully") ? "text-emerald-400" : "text-red-400"}`}>
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
        {saving ? "Publishing…" : "Publish Delivery Photos"}
      </button>
    </form>
  );
}

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
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30";
