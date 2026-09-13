import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";

export default async function AdminDashboardPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">

      <div className="mx-auto max-w-7xl">

        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            AG7 Cars
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-white/50">
            Manage your vehicle collection and website content.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

          <a
            href="/admin/dashboard/hero"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/40">
              Homepage
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Hero Photos
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Change the rotating hero background photos for desktop and mobile.
            </p>
          </a>

          <a
            href="/admin/dashboard/cars"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/40">
              Collection
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Manage Cars
            </h2>

            <p className="mt-2 text-sm text-white/50">
              View every car, change status, and edit details.
            </p>
          </a>

          <a
            href="/admin/dashboard/cars/new"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/40">
              Collection
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Add New Car
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Add a vehicle with specifications, pricing and up to 10 images.
            </p>
          </a>

          <a
            href="/admin/dashboard/live-deals"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/40">
              Live Deals
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Manage Live Deals
            </h2>

            <p className="mt-2 text-sm text-white/50">
              View every deal and edit its details or photos.
            </p>
          </a>

          <a
            href="/admin/dashboard/live-deals/new"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/40">
              Live Deals
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Add Live Deal
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Add a discounted deal with its own brand, price and photos.
            </p>
          </a>

          <a
            href="/admin/dashboard/deliveries/videos/new"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/40">
              Deliveries
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Add Delivery Video
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Add a video from a recent delivery to AG7 Deliveries Videos.
            </p>
          </a>

          <a
            href="/admin/dashboard/deliveries/photos/new"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
          >
            <p className="text-sm text-white/40">
              Deliveries
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Add Delivery Photo
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Add a photo from a recent delivery to AG7 Deliveries Photos.
            </p>
          </a>

        </div>

      </div>

    </main>
  );
}