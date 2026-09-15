import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import EditTestimonialForm from "@/components/admin/EditTestimonialForm";

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: testimonial } = await supabase
    .from("testimonials")
    .select("id, customer_name, message, photo_url")
    .eq("id", id)
    .maybeSingle();

  if (!testimonial) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <a
            href="/admin/dashboard/testimonials"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to All Testimonials
          </a>

          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            AG7 Cars / Testimonials
          </p>

          <h1 className="mt-2 text-4xl font-semibold">Edit Testimonial</h1>

          <p className="mt-2 text-white/50">{testimonial.customer_name}</p>
        </div>

        <EditTestimonialForm
          testimonial={{
            id: testimonial.id,
            customerName: testimonial.customer_name,
            message: testimonial.message,
            photoUrl: testimonial.photo_url,
          }}
        />
      </div>
    </main>
  );
}
