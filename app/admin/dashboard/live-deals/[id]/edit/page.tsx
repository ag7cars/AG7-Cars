import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import EditLiveDealForm from "@/components/admin/EditLiveDealForm";

export default async function EditLiveDealPage({
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

  const { data: deal } = await supabase
    .from("live_deals")
    .select("id, brand, name, original_price, deal_price, currency, description, image_urls")
    .eq("id", id)
    .maybeSingle();

  if (!deal) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <a
            href="/admin/dashboard/live-deals"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to All Live Deals
          </a>

          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            AG7 Cars / Live Deals
          </p>

          <h1 className="mt-2 text-4xl font-semibold">Edit Live Deal</h1>

          <p className="mt-2 text-white/50">
            {deal.brand} {deal.name}
          </p>
        </div>

        <EditLiveDealForm
          deal={{
            id: deal.id,
            brand: deal.brand,
            name: deal.name,
            original_price: deal.original_price,
            deal_price: deal.deal_price,
            currency: deal.currency,
            description: deal.description ?? undefined,
            image_urls: deal.image_urls ?? [],
          }}
        />
      </div>
    </main>
  );
}
