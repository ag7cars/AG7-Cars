import Image from "next/image";
import Link from "next/link";

const quickLinks = [
  { name: "AG7 Collection", href: "#collection" },
  { name: "Live Deals", href: "#live-deals" },
  { name: "AG7 Deliveries", href: "#deliveries" },
  { name: "About Us", href: "#about" },
  { name: "Contact Us", href: "#contact" },
];

const socialLinks = [
  { name: "Instagram", href: "https://www.instagram.com/AG7CarsOfficial" },
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/1D3agitBpX/?mibextid=wwXIfr",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/ag7-logo.png"
                alt="AG7 Cars logo"
                width={40}
                height={40}
                className="h-9 w-9 rounded-full object-cover"
              />
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-white/50">
              Discover an exclusive collection of remarkable new and exceptional pre-owned supercars and luxury automobiles, 
              curated for those who expect nothing but the extraordinary
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              Explore
            </p>
            <ul className="mt-4 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              Contact
            </p>
            <ul className="mt-4 space-y-3 text-sm text-white/60">
              <li>
                <a href="tel:+917247777724" className="transition hover:text-white">
                  +91 72477 77724
                </a>
              </li>
              <li>
                <a href="mailto:AG7Cars@gmail.com" className="transition hover:text-white">
                  AG7Cars@gmail.com
                </a>
              </li>
              <li>Indore, Madhya Pradesh</li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              Follow
            </p>
            <ul className="mt-4 space-y-3">
              {socialLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/60 transition hover:text-white"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
          <p className="text-xs text-white/40">
            © 2023 AG7 Cars. All rights reserved.
          </p>
          <p className="text-xs text-white/30">
            Built for those who expect more from every drive.
          </p>
        </div>
      </div>
    </footer>
  );
}