"use client";

import { useEffect, useRef, useState } from "react";

// Mouse hover never fires on touch devices, so a phone visitor would
// never see a card's hover reveal animation at all. This plays it
// once, automatically, the first time a card scrolls far enough into
// view — but only on devices that genuinely have no hover (checked
// via matchMedia), so desktop keeps relying on real :hover untouched.
export function useTouchReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(hover: hover)").matches) {
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}
