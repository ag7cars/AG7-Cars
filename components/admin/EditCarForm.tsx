"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const carSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  name: z.string().min(1, "Car name is required"),
  price: z.number().positive("Price must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  category: z.enum(["Pre-Owned", "New", "Demo"]),
  status: z.enum(["available", "booked", "sold"]),
  km_driven: z.number().nonnegative().optional(),
  // Free text — the RTO/state registration code, e.g. "MP 09", not
  // the full plate number.
  registration: z.string().trim().optional(),
  // 0 is a deliberate sentinel for "Unregistered" — the input's
  // setValueAs (below) swaps it for undefined before it ever reaches
  // this schema, so the range check only ever sees a real year.
  year: z.number().min(1900).max(2100).optional(),
  manufacturing_year: z.number().min(1900).max(2100).optional(),
  ownership: z.string().optional(),
  fuel: z.enum(["Petrol", "Diesel", "Hybrid", "Electric"]).optional(),
  body_type: z.string().optional(),
  engine: z.string().optional(),
  description: z.string().optional(),
});

type CarFormValues = z.infer<typeof carSchema>;

export type EditableCar = CarFormValues & {
  id: string;
  image_urls: string[];
};

export default function EditCarForm({ car }: { car: EditableCar }) {
  const router = useRouter();
  const [existingImages, setExistingImages] = useState<string[]>(car.image_urls ?? []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CarFormValues>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      brand: car.brand,
      name: car.name,
      price: car.price,
      currency: car.currency,
      category: car.category,
      status: car.status,
      km_driven: car.km_driven,
      registration: car.registration,
      year: car.year,
      manufacturing_year: car.manufacturing_year,
      ownership: car.ownership,
      fuel: car.fuel,
      body_type: car.body_type,
      engine: car.engine,
      description: car.description,
    },
  });

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

  const onSubmit: SubmitHandler<CarFormValues> = async (values) => {
    if (totalImageCount === 0) {
      setMessage("Please keep at least one photo.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("car", JSON.stringify(values));
      formData.append("existingImages", JSON.stringify(existingImages));
      newImages.forEach((image) => formData.append("images", image));

      const response = await fetch(`/api/admin/cars/${car.id}`, {
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

      router.push("/admin/dashboard/cars");
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
          BASIC INFORMATION
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Brand" error={errors.brand?.message}>
            <input {...register("brand")} placeholder="Lamborghini" className={inputClass} />
          </Field>

          <Field label="Car Name" error={errors.name?.message}>
            <input {...register("name")} placeholder="Huracán EVO" className={inputClass} />
          </Field>

          <Field label="Price" error={errors.price?.message}>
            <input
              {...register("price", { valueAsNumber: true })}
              type="number"
              placeholder="32500000"
              className={inputClass}
            />
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

          <Field label="Category" error={errors.category?.message}>
            <select {...register("category")} className={selectClass} style={{ colorScheme: "dark" }}>
              <option value="Pre-Owned" style={optionStyle}>Pre-Owned</option>
              <option value="New" style={optionStyle}>New</option>
              <option value="Demo" style={optionStyle}>Demo</option>
            </select>
          </Field>

          <Field label="Status" error={errors.status?.message}>
            <select {...register("status")} className={selectClass} style={{ colorScheme: "dark" }}>
              <option value="available" style={optionStyle}>Available</option>
              <option value="booked" style={optionStyle}>Booked</option>
              <option value="sold" style={optionStyle}>Sold</option>
            </select>
          </Field>
        </div>
      </section>

      {/* =====================================================
          SPECIFICATIONS
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Specifications</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="KM Driven" error={errors.km_driven?.message}>
            <input
              {...register("km_driven", { valueAsNumber: true })}
              type="number"
              placeholder="8500"
              className={inputClass}
            />
          </Field>

          <Field label="Registration" error={errors.registration?.message}>
            <input
              {...register("registration")}
              placeholder="MP 09"
              className={inputClass}
            />
          </Field>

          <Field label="Registration Year" error={errors.year?.message}>
            <input
              {...register("year", {
                // 0 means "Unregistered" — cleared to undefined here
                // instead of being validated as a real year.
                setValueAs: (value) => {
                  if (value === "" || value === null || value === undefined) return undefined;
                  const num = Number(value);
                  if (Number.isNaN(num)) return undefined;
                  return num === 0 ? undefined : num;
                },
              })}
              type="number"
              placeholder="2023, or 0 for Unregistered"
              className={inputClass}
            />
          </Field>

          <Field label="Manufacturing Year" error={errors.manufacturing_year?.message}>
            <input
              {...register("manufacturing_year", { valueAsNumber: true })}
              type="number"
              placeholder="2022"
              className={inputClass}
            />
          </Field>

          <Field label="Ownership" error={errors.ownership?.message}>
            <select {...register("ownership")} className={selectClass} style={{ colorScheme: "dark" }} defaultValue="">
              <option value="" disabled style={optionStyle}>Select ownership</option>
              <option value="Unregistered" style={optionStyle}>Unregistered</option>
              <option value="1st Owner" style={optionStyle}>1st Owner</option>
              <option value="2nd Owner" style={optionStyle}>2nd Owner</option>
              <option value="3rd Owner" style={optionStyle}>3rd Owner</option>
              <option value="4th Owner or more" style={optionStyle}>4th Owner or more</option>
            </select>
          </Field>

          <Field label="Fuel" error={errors.fuel?.message}>
            <select {...register("fuel")} className={selectClass} style={{ colorScheme: "dark" }}>
              <option value="" disabled style={optionStyle}>Select fuel type</option>
              <option value="Petrol" style={optionStyle}>Petrol</option>
              <option value="Diesel" style={optionStyle}>Diesel</option>
              <option value="Hybrid" style={optionStyle}>Hybrid</option>
              <option value="Electric" style={optionStyle}>Electric</option>
            </select>
          </Field>

          <Field label="Body Type" error={errors.body_type?.message}>
            <select {...register("body_type")} className={selectClass} style={{ colorScheme: "dark" }}>
              <option value="" disabled style={optionStyle}>Select body type</option>
              <option value="Convertible" style={optionStyle}>Convertible</option>
              <option value="Coupe" style={optionStyle}>Coupe</option>
              <option value="Hatchback" style={optionStyle}>Hatchback</option>
              <option value="Pickup Truck" style={optionStyle}>Pickup Truck</option>
              <option value="Sedan" style={optionStyle}>Sedan</option>
              <option value="Sports Car" style={optionStyle}>Sports Car</option>
              <option value="Supercar" style={optionStyle}>Supercar</option>
              <option value="SUV" style={optionStyle}>SUV</option>
              <option value="Van / MPV" style={optionStyle}>Van / MPV</option>
              <option value="Wagon" style={optionStyle}>Wagon</option>
            </select>
          </Field>

          <Field label="Engine" error={errors.engine?.message}>
            <input {...register("engine")} placeholder="5.2L V10" className={inputClass} />
          </Field>
        </div>
      </section>

      {/* =====================================================
          DESCRIPTION
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Description</h2>
        <textarea
          {...register("description")}
          rows={7}
          placeholder="Write the detailed description of the vehicle..."
          className={`${inputClass} mt-6 min-h-[180px] resize-y py-3`}
        />
      </section>

      {/* =====================================================
          IMAGES
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Vehicle Images</h2>
        <p className="mt-2 text-sm text-white/50">
          The first photo is the Collection cover image. Remove or reorder
          existing photos, and add new ones — up to 10 total.
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
                    <img src={url} alt={`Vehicle photo ${index + 1}`} className="h-full w-full object-cover" />

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
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
          {message}
        </div>
      )}

      {/* =====================================================
          SUBMIT
          ===================================================== */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-13 flex-1 rounded-xl bg-white px-6 font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <a
          href="/admin/dashboard/cars"
          className="h-13 flex items-center justify-center rounded-xl border border-white/20 px-6 font-semibold text-white transition hover:border-white"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

/* ============================================================
   REUSABLE FORM FIELD
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
      <label className="mb-2 block text-sm font-medium text-white/70">{label}</label>
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
