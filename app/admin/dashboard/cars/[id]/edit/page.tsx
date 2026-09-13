import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import EditCarForm from "@/components/admin/EditCarForm";

export default async function EditCarPage({
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

  const { data: car } = await supabase
    .from("cars")
    .select(
      "id, brand, name, price, currency, category, status, km_driven, registration, year, manufacturing_year, ownership, fuel, body_type, engine, description, image_urls"
    )
    .eq("id", id)
    .maybeSingle();

  if (!car) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <a
            href="/admin/dashboard/cars"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
          >
            ← Back to All Cars
          </a>

          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            AG7 Cars / Collection
          </p>

          <h1 className="mt-2 text-4xl font-semibold">Edit Car</h1>

          <p className="mt-2 text-white/50">
            {car.brand} {car.name}
          </p>
        </div>

        <EditCarForm
          car={{
            id: car.id,
            brand: car.brand,
            name: car.name,
            price: car.price ?? 0,
            currency: car.currency,
            category: car.category as "Pre-Owned" | "New" | "Demo",
            status: car.status as "available" | "booked" | "sold",
            km_driven: car.km_driven ?? undefined,
            registration: car.registration ?? undefined,
            year: car.year ?? undefined,
            manufacturing_year: car.manufacturing_year ?? undefined,
            ownership: car.ownership ?? undefined,
            fuel: (car.fuel as "Petrol" | "Diesel" | "Hybrid" | "Electric" | undefined) ?? undefined,
            body_type: car.body_type ?? undefined,
            engine: car.engine ?? undefined,
            description: car.description ?? undefined,
            image_urls: car.image_urls ?? [],
          }}
        />
      </div>
    </main>
  );
}
