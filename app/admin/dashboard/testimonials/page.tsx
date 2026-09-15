import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DeleteButton from "@/components/admin/DeleteButton";

export default async function AdminTestimonialsListPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = await createClient();

  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("id, customer_name, photo_url, message, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <a
              href="/admin/dashboard"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
            >
              ← Back to Dashboard
            </a>

            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              AG7 Cars / Testimonials
            </p>

            <h1 className="mt-2 text-4xl font-semibold">All Testimonials</h1>

            <p className="mt-2 text-white/50">
              {testimonials?.length ?? 0} testimonial{testimonials?.length === 1 ? "" : "s"} published.
            </p>
          </div>

          <a
            href="/admin/dashboard/testimonials/new"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            + Add Testimonial
          </a>
        </div>

        {!testimonials || testimonials.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
            No testimonials have been added yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/5">
                    <Image src={testimonial.photo_url} alt={testimonial.customer_name} fill sizes="48px" className="object-cover" />
                  </div>
                  <p className="font-medium">{testimonial.customer_name}</p>
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-white/60">{testimonial.message}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <Link
                    href={`/admin/dashboard/testimonials/${testimonial.id}/edit`}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-white/20 px-3 text-xs font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                  >
                    Edit
                  </Link>
                  <DeleteButton
                    endpoint={`/api/admin/testimonials/${testimonial.id}`}
                    confirmMessage={`Delete this testimonial from ${testimonial.customer_name}? This cannot be undone.`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
