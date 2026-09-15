export type Testimonial = {
  id: string;
  customerName: string;
  photoUrl: string;
  message: string;
};

export default function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#e8c874]">In Their Words</p>
        <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
          Customer Testimonials
        </h2>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-white/5 bg-black px-6 py-10 text-center"
          >
            <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#e8c874]/10 blur-[70px]" />

            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#e8c874]/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={testimonial.photoUrl} alt={testimonial.customerName} className="h-full w-full object-cover" />
            </div>

            <p className="relative mt-5 text-sm leading-7 text-white/70">&ldquo;{testimonial.message}&rdquo;</p>

            <span className="relative mt-5 h-px w-8 bg-gradient-to-r from-[#e8c874] to-transparent" />
            <p className="relative mt-3 text-sm font-semibold text-white">{testimonial.customerName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
