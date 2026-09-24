"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const liveDealSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required"),
  name: z.string().trim().min(1, "Name is required"),
  // Both optional — some deals are listed as available without a
  // price shown at all yet.
  original_price: z.number().positive("Enter a valid price").optional(),
  deal_price: z.number().positive("Enter a valid price").optional(),
  currency: z.string().trim().min(1),
  category: z.enum(["Pre-Owned", "New", "Demo"]),
  description: z.string().optional(),
});

type LiveDealFormValues = z.infer<typeof liveDealSchema>;

export type EditableLiveDeal = LiveDealFormValues & {
  id: string;
  image_urls: string[];
};

export default function EditLiveDealForm({ deal }: { deal: EditableLiveDeal }) {
  const router = useRouter();
  const [existingImages, setExistingImages] = useState<string[]>(deal.image_urls ?? []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LiveDealFormValues>({
    resolver: zodResolver(liveDealSchema),
    defaultValues: {
      brand: deal.brand,
      name: deal.name,
      original_price: deal.original_price,
      deal_price: deal.deal_price,
      currency: deal.currency,
      category: deal.category,
      description: deal.description,
    },
  });

  const originalPrice = watch("original_price");
  const dealPrice = watch("deal_price");
  const discountPercent =
    originalPrice && dealPrice && originalPrice > dealPrice
      ? Math.round(((originalPrice - dealPrice) / originalPrice) * 100)
      : null;

  const totalImageCount = existingImages.length + newImages.length;

  function addImages(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selected.length === 0) return;

    setNewImages((current) => {
      const combined = [...current, ...selected];
      const allowed = combined.slice(0, Math.max(0, 10 - existingImages.length));

      if (combined.length > allowed.length) {
        setMessage("You can have a maximum of 10 images total.");
      } else {
        setMessage("");
      }

      setNewPreviews((prevUrls) => {
        prevUrls.forEach((url) => URL.revokeObjectURL(url));
        return allowed.map((file) => URL.createObjectURL(file));
      });

      return allowed;
    });
  }

  function removeExistingImage(index: number) {
    setExistingImages((current) => current.filter((_, i) => i !== index));
  }

  function moveExistingImage(index: number, direction: -1 | 1) {
    setExistingImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeNewImage(index: number) {
    setNewImages((current) => current.filter((_, i) => i !== index));
    setNewPreviews((current) => {
      URL.revokeObjectURL(current[index]);
      return current.filter((_, i) => i !== index);
    });
  }

  const onSubmit: SubmitHandler<LiveDealFormValues> = async (values) => {
    if (totalImageCount === 0) {
      setMessage("Please keep at least one photo.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      // Both prices are sent explicitly as null (rather than omitted)
      // when cleared, so the server's partial update actually clears
      // the column instead of leaving the previous value in place.
      formData.append(
        "deal",
        JSON.stringify({
          ...values,
          original_price: values.original_price ?? null,
          deal_price: values.deal_price ?? null,
        })
      );
      formData.append("existingImages", JSON.stringify(existingImages));
      newImages.forEach((image) => formData.append("images", image));

      const response = await fetch(`/api/admin/live-deals/${deal.id}`, {
        method: "PATCH",
        body: formData,
      });

      const text = await response.text();
      let result: { error?: string } = {};
      if (text) {
        try {
          result = JSON.parse(text) as { error?: string };
        } catch {
          throw new Error(`Update failed (${response.status} ${response.statusText}).`);
        }
      }

      if (!response.ok) {
        throw new Error(result.error || "Unable to save changes.");
      }

      router.push("/admin/dashboard/live-deals");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* =====================================================
          DEAL DETAILS
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Deal Details</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Brand" error={errors.brand?.message}>
            <input {...register("brand")} placeholder="Lamborghini" className={inputClass} />
          </Field>

          <Field label="Name" error={errors.name?.message}>
            <input {...register("name")} placeholder="Huracán EVO" className={inputClass} />
          </Field>

          <Field label="Currency" error={errors.currency?.message}>
            <select {...register("currency")} className={selectClass} style={{ colorScheme: "dark" }}>
              <option value="INR" style={optionStyle}>INR</option>
              <option value="USD" style={optionStyle}>USD</option>
              <option value="AED" style={optionStyle}>AED</option>
              <option value="GBP" style={optionStyle}>GBP</option>
              <option value="EUR" style={optionStyle}>EUR</option>
            </select>
          </Field>

          <Field label="Original Price (Optional)" error={errors.original_price?.message}>
            <input
              type="number"
              step="0.01"
              {...register("original_price", {
                // Empty input becomes undefined (optional field) rather
                // than NaN, which valueAsNumber would produce and which
                // z.number() always rejects, even when .optional().
                setValueAs: (value) => (value === "" || value === null ? undefined : Number(value)),
              })}
              placeholder="9500000"
              className={inputClass}
            />
          </Field>

          <Field label="Deal Price (Optional)" error={errors.deal_price?.message}>
            <input
              type="number"
              step="0.01"
              {...register("deal_price", {
                setValueAs: (value) => (value === "" || value === null ? undefined : Number(value)),
              })}
              placeholder="8200000"
              className={inputClass}
            />
          </Field>

          <Field label="Category" error={errors.category?.message}>
            <select {...register("category")} className={selectClass} style={{ colorScheme: "dark" }}>
              <option value="Pre-Owned" style={optionStyle}>Pre-Owned</option>
              <option value="New" style={optionStyle}>New</option>
              <option value="Demo" style={optionStyle}>Demo</option>
            </select>
          </Field>
        </div>

        {discountPercent !== null && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            {discountPercent}% OFF — customers save on this deal
          </p>
        )}

        <div className="mt-5">
          <Field label="Description" error={errors.description?.message}>
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
        <h2 className="text-xl font-semibold">Deal Images</h2>
        <p className="mt-2 text-sm text-white/50">
          The first photo is the cover image. Remove or reorder existing
          photos, and add new ones — up to 10 total.
        </p>

        {existingImages.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-xs uppercase tracking-wide text-white/40">Current photos</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {existingImages.map((url, index) => (
                <div
                  key={url}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="relative aspect-square w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Deal photo ${index + 1}`} className="h-full w-full object-cover" />

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
                      onClick={() => moveExistingImage(index, -1)}
                      disabled={index === 0}
                      aria-label="Move image earlier"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      aria-label="Remove image"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-red-500/20 hover:text-red-300"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExistingImage(index, 1)}
                      disabled={index === existingImages.length - 1}
                      aria-label="Move image later"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          disabled={totalImageCount >= 10}
          className="mt-6 flex w-full items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {newImages.length === 0 ? "Add New Photos" : `Add More (${totalImageCount}/10)`}
        </button>

        {newImages.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-xs uppercase tracking-wide text-white/40">New photos to add</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {newImages.map((image, index) => (
                <div
                  key={`${image.name}-${image.lastModified}-${index}`}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="relative aspect-square w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newPreviews[index]}
                      alt={`New photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    aria-label="Remove image"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white/80 transition hover:bg-red-500/70 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-13 flex-1 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <a
          href="/admin/dashboard/live-deals"
          className="h-13 flex items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-white"
        >
          Cancel
        </a>
      </div>
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
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
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
