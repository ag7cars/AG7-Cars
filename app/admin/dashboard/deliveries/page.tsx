import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getYouTubeVideoId, isYouTubeUrl, toYouTubeThumbnailUrl } from "@/lib/youtube";
import DeleteButton from "@/components/admin/DeleteButton";

export default async function AdminDeliveriesListPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = await createClient();

  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("id, brand, model, media_type, media_url, is_published, created_at")
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
              AG7 Cars / AG7 Deliveries
            </p>

            <h1 className="mt-2 text-4xl font-semibold">All Deliveries</h1>

            <p className="mt-2 text-white/50">
              {deliveries?.length ?? 0} item{deliveries?.length === 1 ? "" : "s"} listed.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/admin/dashboard/deliveries/videos/new"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-white"
            >
              + Add Video
            </a>
            <a
              href="/admin/dashboard/deliveries/photos/new"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              + Add Photo
            </a>
          </div>
        </div>

        {!deliveries || deliveries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
            No deliveries have been added yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => {
                  const thumbnail =
                    delivery.media_type === "video" && isYouTubeUrl(delivery.media_url)
                      ? toYouTubeThumbnailUrl(getYouTubeVideoId(delivery.media_url)!)
                      : delivery.media_type === "image"
                        ? delivery.media_url
                        : null;

                  return (
                    <tr key={delivery.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
                            {thumbnail ? (
                              <Image
                                src={thumbnail}
                                alt={[delivery.brand, delivery.model].filter(Boolean).join(" ") || "Delivery"}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <video src={delivery.media_url} muted className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs uppercase tracking-wide text-white/40">
                              {delivery.brand || "—"}
                            </p>
                            <p className="truncate font-medium">{delivery.model || "Untitled"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-semibold capitalize">
                          {delivery.media_type}
                          {delivery.media_type === "video" && isYouTubeUrl(delivery.media_url) && (
                            <span className="text-red-300">· YouTube</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            delivery.is_published
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                              : "border-white/20 bg-white/5 text-white/50"
                          }`}
                        >
                          {delivery.is_published ? "Published" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/dashboard/deliveries/${delivery.id}/edit`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-white/20 px-3 text-xs font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                          >
                            Edit
                          </Link>
                          <DeleteButton
                            endpoint={`/api/admin/deliveries/${delivery.id}`}
                            confirmMessage={`Delete this ${delivery.media_type}${
                              delivery.brand || delivery.model
                                ? ` (${[delivery.brand, delivery.model].filter(Boolean).join(" ")})`
                                : ""
                            }? This cannot be undone.`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
