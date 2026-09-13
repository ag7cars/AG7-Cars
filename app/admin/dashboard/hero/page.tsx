import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import HeroPhotosForm from "@/components/admin/HeroPhotosForm";

// Matches components/home/Hero.tsx's hardcoded fallbacks — used if
// the hero_images table is missing rows for a slot (e.g. right after
// the migration runs, before every row exists yet).
const FALLBACK: Record<"desktop" | "mobile", string[]> = {
  desktop: [
    "/images/Home (1).jpg",
    "/images/Home (3).jpg",
    "/images/Home (4).jpg",
    "/images/Home (5).jpg",
  ],
  mobile: [
    "/images/home-mobile 1.jpg",
    "/images/home-mobile 2.jpg",
    "/images/home-mobile 3.jpg",
    "/images/home-mobile 4.jpg",
  ],
};

export default async function HeroPhotosPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("hero_images")
    .select("slot, position, image_url")
    .order("position", { ascending: true });

  const images: Record<"desktop" | "mobile", string[]> = {
    desktop: [...FALLBACK.desktop],
    mobile: [...FALLBACK.mobile],
  };

  for (const row of data ?? []) {
    const slot = row.slot as "desktop" | "mobile";
    if (row.position >= 1 && row.position <= 4) {
      images[slot][row.position - 1] = row.image_url;
    }
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
            AG7 Cars / Homepage
          </p>

          <h1 className="mt-2 text-4xl font-semibold">Hero Photos</h1>

          <p className="mt-2 text-white/50">
            Change the rotating background photos on the homepage hero section.
          </p>
        </div>

        <HeroPhotosForm initialImages={images} />
      </div>
    </main>
  );
}
