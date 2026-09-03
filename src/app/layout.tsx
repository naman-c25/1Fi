import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "1Fi — Buy on EMI backed by your mutual funds",
    template: "%s | 1Fi",
  },
  description:
    "Shop flagship smartphones on EMI plans collateralised against your mutual fund holdings. Stay invested while you pay.",
};

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-600 text-[15px] font-bold text-white shadow-sm"
      >
        1Fi
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink-900">
        EMI Store
      </span>
    </span>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions and translation tools routinely rewrite attributes on
    // <html> and <body> (normalising lang="en-IN" to "en", adding their own
    // data-* markers) before React hydrates, which React reports as a mismatch.
    // suppressHydrationWarning applies to these two elements' own attributes
    // only — never their children — so real mismatches inside the app still
    // surface.
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <header className="sticky top-0 z-40 border-b border-hairline bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" aria-label="1Fi EMI Store home">
              <Logo />
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium text-ink-500">
              <Link
                href="/products"
                className="rounded-lg px-3 py-2 transition-colors hover:bg-canvas hover:text-ink-900"
              >
                Products
              </Link>
              <a
                href="/api"
                className="rounded-lg px-3 py-2 transition-colors hover:bg-canvas hover:text-ink-900"
              >
                API
              </a>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
          {children}
        </main>

        <footer className="border-t border-hairline bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              Built for the 1Fi SDE1 assignment · Next.js, PostgreSQL, Prisma, Tailwind CSS
            </p>
            <p className="text-xs">
              Illustrative pricing. Investments in mutual funds are subject to market risks.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
