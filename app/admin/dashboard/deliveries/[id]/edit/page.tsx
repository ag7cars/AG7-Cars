import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import EditDeliveryForm from "@/components/admin/EditDeliveryForm";
import EditDeliveryPhotoForm from "@/components/admin/EditDeliveryPhotoForm";

export default async function EditDeliveryPage({
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

  const { data: delivery } = await supabase
    .from("deliveries")
    .select("id, brand, model, caption, media_type, media_url, image_urls")
    .eq("id", id)
    .maybeSingle();

  if (!delivery) {
    notFound();
  }

  const isVideo = delivery.media_type === "video";

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <a
            href="/admin/dashboard/deliveries"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to All Deliveries
          </a>

          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            AG7 Cars / AG7 Deliveries
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            Edit Delivery {isVideo ? "Video" : "Photos"}
          </h1>

          <p className="mt-2 text-white/50">
            {[delivery.brand, delivery.model].filter(Boolean).join(" ") || "Untitled delivery"}
          </p>
        </div>

        {isVideo ? (
          <EditDeliveryForm
            delivery={{
              id: delivery.id,
              brand: delivery.brand ?? "",
              model: delivery.model ?? "",
              caption: delivery.caption ?? undefined,
              mediaUrl: delivery.media_url,
            }}
          />
        ) : (
          <EditDeliveryPhotoForm
            delivery={{
              id: delivery.id,
              brand: delivery.brand ?? "",
              model: delivery.model ?? "",
              caption: delivery.caption ?? undefined,
              imageUrls: delivery.image_urls?.length ? delivery.image_urls : [delivery.media_url],
            }}
          />
        )}
      </div>
    </main>
  );
}
