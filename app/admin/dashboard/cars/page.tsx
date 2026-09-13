import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DeleteButton from "@/components/admin/DeleteButton";

const statusStyles: Record<string, string> = {
  available: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  booked: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  sold: "border-rose-400/40 bg-rose-400/10 text-rose-300",
};

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "Price on request";
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

export default async function AdminCarsListPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = await createClient();

  const { data: cars } = await supabase
    .from("cars")
    .select("id, slug, brand, name, price, currency, status, category, image_urls, is_published, created_at")
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
              AG7 Cars / Collection
            </p>

            <h1 className="mt-2 text-4xl font-semibold">All Cars</h1>

            <p className="mt-2 text-white/50">
              {cars?.length ?? 0} car{cars?.length === 1 ? "" : "s"} in the collection.
            </p>
          </div>

          <a
            href="/admin/dashboard/cars/new"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            + Add New Car
          </a>
        </div>

        {!cars || cars.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
            No cars have been added yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3 font-medium">Car</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr key={car.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
                          {car.image_urls?.[0] ? (
                            <Image
                              src={car.image_urls[0]}
                              alt={`${car.brand} ${car.name}`}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs uppercase tracking-wide text-white/40">
                            {car.brand}
                          </p>
                          <p className="truncate font-medium">{car.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{car.category}</td>
                    <td className="px-4 py-3 text-white/70">
                      {formatPrice(car.price, car.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[car.status]}`}
                      >
                        {car.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          car.is_published
                            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                            : "border-white/20 bg-white/5 text-white/50"
                        }`}
                      >
                        {car.is_published ? "Published" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/dashboard/cars/${car.id}/edit`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-white/20 px-3 text-xs font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                        >
                          Edit
                        </Link>
                        <DeleteButton
                          endpoint={`/api/admin/cars/${car.id}`}
                          confirmMessage={`Delete ${car.brand} ${car.name}? This permanently removes it and its photos, and cannot be undone.`}
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
