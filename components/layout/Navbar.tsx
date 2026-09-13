"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarIcon, TagIcon, TruckIcon, InfoIcon, MailIcon } from "./icons";

const tabs = [
  { name: "AG7 Collection", href: "/cars" },
  { name: "Live Deals", href: "/live-deals" },
  { name: "AG7 Deliveries", href: "/deliveries" },
  { name: "About Us", href: "/#about" },
  { name: "Contact Us", href: "/#contact" },
];

const mobileMenuLinks = [
  { name: "AG7 Collection", href: "/cars", icon: CarIcon },
  { name: "Live Deals", href: "/live-deals", icon: TagIcon },
  { name: "AG7 Deliveries", href: "/deliveries", icon: TruckIcon },
  { name: "About Us", href: "/#about", icon: InfoIcon },
  { name: "Contact Us", href: "/#contact", icon: MailIcon },
];

// Next.js's <Link> navigates via history.pushState, which — unlike a
// plain <a> tag or the browser's own back/forward buttons — never
// fires a native `hashchange` (or `popstate`) event. Listening for
// those alone means a same-page click from "/" to "/#contact" (or
// back) never updates this, so the active-tab highlight goes stale
// until something else forces a remount. The listeners here still
// catch back/forward and manual URL edits; clicks are synced
// directly in the tab's own onClick instead (see handleTabClick).
function useCurrentHash() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);

  return [hash, setHash] as const;
}

function isTabActive(tabHref: string, pathname: string, hash: string) {
  const [tabPath, tabHash] = tabHref.split("#");

  if (tabHash) {
    return pathname === "/" && hash === `#${tabHash}`;
  }

  if (tabPath === "/") {
    return pathname === "/" && !hash;
  }

  return pathname.startsWith(tabPath);
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [hash, setHash] = useCurrentHash();

  // Plain `overflow: hidden` on body doesn't reliably block
  // background touch-scrolling on iOS Safari behind a fixed overlay
  // — pin the body in place at its current scroll offset instead,
  // then restore the exact position on close.
  useEffect(() => {
    if (!menuOpen) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.overflow = "hidden";

    return () => {
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";
      style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  // Keeps the active-tab highlight in sync with same-page nav clicks
  // (see the comment on useCurrentHash for why the browser events
  // alone can't be trusted for this).
  function handleTabClick(tabHref: string) {
    return (event: React.MouseEvent) => {
      const [tabPath, tabHash] = tabHref.split("#");

      if (tabHash) {
        setHash(`#${tabHash}`);
        return;
      }

      // Clicking Home while already on "/" is a no-op route change,
      // so Next.js never scrolls anywhere — scroll to the hero
      // ourselves in that one case.
      if (tabPath === "/" && pathname === "/") {
        event.preventDefault();
        setHash("");
        window.history.pushState(null, "", "/");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setHash("");
    };
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full">
      {/* Full-width navbar background — solid black, not a
          see-through blur, so the hero photo only ever shows
          starting right below this bar (see Hero.tsx). */}
      <div className="w-full bg-black">

        {/* Content container */}
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">
          <nav
            aria-label="Main navigation"
            className="relative flex h-16 items-center justify-between sm:h-20 lg:h-24"
          >

            {/* =====================================================
                WORDMARK — sits on the left so the round logo mark
                below can be centered on its own, independent of how
                wide the tabs on the right end up being.
                ===================================================== */}
            <Link
              href="/"
              aria-label="AG7 Cars home"
              onClick={handleTabClick("/")}
              className="flex items-center"
            >
              {/* 28px is the target size, but flat 28px on a narrow
                  phone runs this text into the absolutely-centered
                  logo next to it — scale up to that size only once
                  there's room for it. */}
              <span className="font-display text-base font-[413] tracking-[0.15em] text-white sm:text-xl lg:text-[28px]">
                AG7 CARS
              </span>
            </Link>

            {/* =====================================================
                LOGO — absolutely centered in the bar so it stays put
                regardless of the wordmark's or tabs' own width.
                ===================================================== */}
            <Link
              href="/"
              aria-label="Cars home"
              onClick={handleTabClick("/")}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <Image
                src="/images/ag7-logo.png"
                alt="AG7 Cars logo"
                width={48}
                height={48}
                priority
                className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10 lg:h-11 lg:w-11"
              />
            </Link>

            {/* =====================================================
                DESKTOP NAVIGATION — text labels; the active one gets
                a soft spotlight glow instead of an icon indicator.
                Held off until xl, and kept compact there too: five
                tabs next to a wordmark and a centered logo need real
                width to clear each other — at lg (1024–1279px) they
                collided, so that range falls back to the hamburger
                menu, and even at xl the pill stays small so there's
                a visible gap instead of crowding the logo.
                ===================================================== */}
            <ul className="hidden items-center gap-0.5 rounded-full border border-white/10 bg-white/5 px-1.5 py-1 xl:flex">
              {tabs.map((tab) => {
                const active = isTabActive(tab.href, pathname, hash);

                return (
                  <li key={tab.name}>
                    <Link
                      href={tab.href}
                      onClick={handleTabClick(tab.href)}
                      aria-current={active ? "page" : undefined}
                      className={`relative block overflow-hidden rounded-full px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors duration-300 hover:text-white ${
                        active ? "text-white" : ""
                      }`}
                    >
                      {active && (
                        // A soft glow sitting inside the label's own
                        // box (never offset past its edges, so it
                        // can't poke out past the pill's rounded
                        // corners) — reads as light spilling down
                        // from just above the text.
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-1 top-0 h-3 rounded-full bg-white/90 blur-[7px]"
                        />
                      )}
                      <span className="relative">{tab.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* =====================================================
                MOBILE MENU TRIGGER
                ===================================================== */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              className="relative z-[101] flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-transparent shadow-lg transition-transform active:scale-95 xl:hidden"
            >
              <span className="flex flex-col gap-1">
                <span className="h-0.5 w-4 rounded-full bg-white" />
                <span className="h-0.5 w-4 rounded-full bg-white" />
                <span className="h-0.5 w-4 rounded-full bg-white" />
              </span>
            </button>

          </nav>
        </div>
      </div>

      {/* =====================================================
          FULL-SCREEN MOBILE MENU — expands from the hamburger
          button via an animated clip-path circle rather than a
          dropdown, so it reads as the menu "growing" out of the
          button and covering the whole screen.
          ===================================================== */}
      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-black to-zinc-950 transition-[clip-path] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] xl:hidden ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{
          clipPath: menuOpen
            ? "circle(150% at calc(100% - 40px) 34px)"
            : "circle(0% at calc(100% - 40px) 34px)",
        }}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation menu"
          className={`absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white transition-opacity duration-300 sm:right-8 ${
            menuOpen ? "opacity-100 delay-300" : "pointer-events-none opacity-0"
          }`}
        >
          <span className="relative block h-4 w-4">
            <span className="absolute left-1/2 top-1/2 h-0.5 w-4.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-white" />
            <span className="absolute left-1/2 top-1/2 h-0.5 w-4.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-white" />
          </span>
        </button>

        <nav
          className={`flex flex-col items-center gap-7 transition-all duration-500 ${
            menuOpen ? "translate-y-0 opacity-100 delay-200" : "translate-y-4 opacity-0"
          }`}
        >
          {mobileMenuLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={(event) => {
                handleTabClick(item.href)(event);
                setMenuOpen(false);
              }}
              className="flex items-center gap-3 text-2xl font-semibold text-white/90 transition-colors hover:text-white sm:text-3xl"
            >
              <item.icon className="h-6 w-6 sm:h-7 sm:w-7" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
