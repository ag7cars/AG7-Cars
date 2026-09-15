import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import AddTestimonialForm from "@/components/admin/AddTestimonialForm";

export default async function AddTestimonialPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
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

          <h1 className="mt-2 text-4xl font-semibold">Add Testimonial</h1>

          <p className="mt-2 text-white/50">
            Add a customer photo and their testimonial to feature on the homepage.
          </p>
        </div>

        <AddTestimonialForm />
      </div>
    </main>
  );
}
