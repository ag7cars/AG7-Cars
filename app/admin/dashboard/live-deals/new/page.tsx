import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import AddLiveDealForm from "@/components/admin/AddLiveDealForm";

export default async function AddLiveDealPage() {
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
            AG7 Cars / Live Deals
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            Add Live Deal
          </h1>

          <p className="mt-2 text-white/50">
            Add a time-sensitive deal with a discounted price and photos.
          </p>
        </div>

        <AddLiveDealForm />

      </div>

    </main>
  );
}