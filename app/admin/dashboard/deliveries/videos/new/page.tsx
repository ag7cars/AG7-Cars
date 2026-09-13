import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import AddDeliveryForm from "@/components/admin/AddDeliveryForm";

export default async function AddDeliveryVideoPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">

      <div className="mx-auto max-w-5xl">

        <div className="mb-10">
          <a
            href="/admin/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to Dashboard
          </a>

          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            AG7 Cars / AG7 Deliveries Videos
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            Add Delivery Video
          </h1>

          <p className="mt-2 text-white/50">
            Add a video from a recent delivery.
          </p>
        </div>

        <AddDeliveryForm mediaKind="video" />

      </div>

    </main>
  );
}
