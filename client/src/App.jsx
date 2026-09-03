import { Link, Route, Routes } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";

// Same-origin unless VITE_API_URL overrides it — see src/api.js.
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-600 text-[15px] font-bold text-white shadow-sm"
      >
        1Fi
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink-900">EMI Store</span>
    </span>
  );
}

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="1Fi EMI Store home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-ink-500">
            <Link
              to="/products"
              className="rounded-lg px-3 py-2 transition-colors hover:bg-canvas hover:text-ink-900"
            >
              Products
            </Link>
            {/* Leaves the SPA on purpose — it points at the Express API. */}
            <a
              href={`${API_BASE}/api`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-2 transition-colors hover:bg-canvas hover:text-ink-900"
            >
              API
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="border-t border-hairline bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Built for the 1Fi SDE1 assignment · React, Express, MongoDB, Tailwind CSS</p>
          <p className="text-xs">
            Illustrative pricing. Investments in mutual funds are subject to market risks.
          </p>
        </div>
      </footer>
    </div>
  );
}
