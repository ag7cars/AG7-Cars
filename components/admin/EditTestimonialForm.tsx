"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import DeleteButton from "@/components/admin/DeleteButton";

const schema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  message: z.string().trim().min(1, "Testimonial text is required").max(600, "Keep it under 600 characters"),
});
type FormValues = z.infer<typeof schema>;

export type EditableTestimonial = FormValues & { id: string; photoUrl: string };

export default function EditTestimonialForm({ testimonial }: { testimonial: EditableTestimonial }) {
  const router = useRouter();
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: testimonial.customerName, message: testimonial.message },
  });

  function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewPhoto(file);
    setNewPreview(file ? URL.createObjectURL(file) : null);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setSaving(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("testimonial", JSON.stringify(values));
      if (newPhoto) formData.append("photo", newPhoto);
      const response = await fetch(`/api/admin/testimonials/${testimonial.id}`, { method: "PATCH", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to save changes.");
      router.push("/admin/dashboard/testimonials");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Customer Photo</h2>
        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={newPreview || testimonial.photoUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-5 text-sm font-medium text-white/70 transition hover:border-white/40">
            Change Photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} className="hidden" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Testimonial</h2>
        <div className="mt-5 space-y-5">
          <Field label="Customer Name" error={errors.customerName?.message}>
            <input {...register("customerName")} className={inputClass} />
          </Field>
          <Field label="Testimonial Text" error={errors.message?.message}>
            <textarea {...register("message")} rows={4} className={`${inputClass} resize-none py-3`} />
          </Field>
        </div>
      </section>

      {message && <p className="text-sm text-red-400">{message}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="h-13 flex-1 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <a href="/admin/dashboard/testimonials" className="h-13 flex items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-white">
          Cancel
        </a>
        <DeleteButton
          endpoint={`/api/admin/testimonials/${testimonial.id}`}
          confirmMessage={`Delete this testimonial from ${testimonial.customerName}? This cannot be undone.`}
          redirectTo="/admin/dashboard/testimonials"
        />
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30";
