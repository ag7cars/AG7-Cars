import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import MigrateMediaPanel from "@/components/admin/MigrateMediaPanel";

export default async function MigrateMediaPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <a href="/admin/dashboard" className="text-sm text-white/50 transition hover:text-white">
          ← Back to Dashboard
        </a>

        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-white/40">Storage</p>
        <h1 className="mt-2 text-4xl font-semibold">Move Media to This Server</h1>
        <p className="mt-3 max-w-xl text-white/50">
          Every photo and video is now saved directly on this server going forward — this page
          handles the one-time move of anything still hosted on Supabase Storage from before that
          change. Supabase Storage needs to actually be reachable (not over its usage quota) for
          step 2 to work.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <MigrateMediaPanel />
        </div>
      </div>
    </main>
  );
}
