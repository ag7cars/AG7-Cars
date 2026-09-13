import type { Metadata } from "next";

// Keeps every /admin/* page out of Google (and other search engines)
// once the site goes live — robots.txt asks crawlers not to visit at
// all, and this noindex tag is the backstop in case a page still
// gets linked/crawled some other way. The admin login/dashboard
// stays fully reachable by direct URL either way.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
