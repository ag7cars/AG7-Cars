import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DeleteButton from "@/components/admin/DeleteButton";

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString()}`;
  }
}

export default async function AdminLiveDealsListPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = await createClient();

  const { data: deals } = await supabase
    .from("live_deals")
    .select("id, brand, name, original_price, deal_price, currency, image_urls, is_published, created_at")
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
              AG7 Cars / Live Deals
            </p>

            <h1 className="mt-2 text-4xl font-semibold">All Live Deals</h1>

            <p className="mt-2 text-white/50">
              {deals?.length ?? 0} deal{deals?.length === 1 ? "" : "s"} listed.
            </p>
          </div>

          <a
            href="/admin/dashboard/live-deals/new"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            + Add Live Deal
          </a>
        </div>

        {!deals || deals.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
            No live deals have been added yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3 font-medium">Deal</th>
                  <th className="px-4 py-3 font-medium">Original Price</th>
                  <th className="px-4 py-3 font-medium">Deal Price</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
                          {deal.image_urls?.[0] ? (
                            <Image
                              src={deal.image_urls[0]}
                              alt={`${deal.brand} ${deal.name}`}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs uppercase tracking-wide text-white/40">
                            {deal.brand}
                          </p>
                          <p className="truncate font-medium">{deal.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/40 line-through">
                      {formatPrice(deal.original_price, deal.currency)}
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-300">
                      {formatPrice(deal.deal_price, deal.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          deal.is_published
                            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                            : "border-white/20 bg-white/5 text-white/50"
                        }`}
                      >
                        {deal.is_published ? "Published" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/dashboard/live-deals/${deal.id}/edit`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-white/20 px-3 text-xs font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                        >
                          Edit
                        </Link>
                        <DeleteButton
                          endpoint={`/api/admin/live-deals/${deal.id}`}
                          confirmMessage={`Delete the ${deal.brand} ${deal.name} deal? This permanently removes it and its photos, and cannot be undone.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
