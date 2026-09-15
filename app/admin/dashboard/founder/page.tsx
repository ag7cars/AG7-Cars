import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import FounderForm from "@/components/admin/FounderForm";

export default async function AdminFounderPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = await createClient();

  const { data: founder } = await supabase
    .from("founder_profile")
    .select("name, title, message, photo_url")
    .eq("id", "main")
    .maybeSingle();

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <a
            href="/admin/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to Dashboard
          </a>

          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            AG7 Cars / About Us
          </p>

          <h1 className="mt-2 text-4xl font-semibold">Founder Details</h1>

          <p className="mt-2 text-white/50">
            Shown on the homepage About Us section.
          </p>
        </div>

        <FounderForm
          founder={{
            name: founder?.name ?? "",
            title: founder?.title ?? "",
            message: founder?.message ?? "",
            photoUrl: founder?.photo_url ?? null,
          }}
        />
      </div>
    </main>
  );
}
