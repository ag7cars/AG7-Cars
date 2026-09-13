import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import AddCarForm from "@/components/admin/AddCarForm";

export default async function AddCarPage() {
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
            AG7 Cars / Collection
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            Add New Car
          </h1>

          <p className="mt-2 text-white/50">
            Add the vehicle details and upload its photographs.
          </p>
        </div>

        <AddCarForm />

      </div>

    </main>
  );
}