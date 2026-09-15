export type Founder = {
  name: string;
  title: string;
  message: string;
  photoUrl: string | null;
};

export default function FounderSection({ founder }: { founder: Founder | null }) {
  if (!founder || !founder.name) return null;

  return (
    <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/5 bg-black px-6 py-12 sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#e8c874]/10 blur-[90px]" />

      <div className="relative flex flex-col items-center gap-8 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-[#e8c874]/30 bg-white/5 sm:h-32 sm:w-32">
          {founder.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={founder.photoUrl} alt={founder.name} className="h-full w-full object-cover" />
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#e8c874]">Meet the Founder</p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">{founder.name}</h3>
          {founder.title && <p className="mt-1 text-sm text-white/50">{founder.title}</p>}
          {founder.message && (
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/70">&ldquo;{founder.message}&rdquo;</p>
          )}
        </div>
      </div>
    </div>
  );
}
