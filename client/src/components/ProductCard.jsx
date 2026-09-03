import { Link } from "react-router-dom";

/** Catalogue tile. Everything on it comes straight from `GET /api/products`. */
export function ProductCard({ product }) {
  return (
    <Link
      to={product.url}
      className="group flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)]"
    >
      <div className="relative flex h-56 items-center justify-center bg-[radial-gradient(ellipse_at_50%_35%,#ffffff_0%,#f2f4f8_78%)] px-6 pt-4">
        {product.isNew && (
          <span className="absolute left-4 top-4 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-brand-700">
            New
          </span>
        )}
        {product.image ? (
          <img
            src={product.image.url}
            alt={product.image.alt}
            className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full rounded-xl bg-canvas" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-hairline p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-300">
            {product.brand}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-ink-900">
            {product.name}
          </h3>
        </div>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="numeric text-xl font-semibold text-ink-900">
            {product.startingPrice.display}
          </span>
          {product.discountPercent > 0 && (
            <>
              <span className="numeric text-sm text-ink-300 line-through">
                {product.startingMrp.display}
              </span>
              <span className="text-xs font-semibold text-cash-600">
                {product.discountPercent}% off
              </span>
            </>
          )}
        </div>

        <p className="numeric text-sm text-ink-500">
          EMI from{" "}
          <span className="font-semibold text-brand-700">
            {product.lowestMonthlyAmount.display}/mo
          </span>{" "}
          · up to {product.longestTenureMonths} months
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5">
            {product.colors.map((color) => (
              <span
                key={color.name}
                title={color.name}
                aria-hidden
                className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                style={{ backgroundColor: color.hex }}
              />
            ))}
            <span className="sr-only">
              Available in {product.colors.map((c) => c.name).join(", ")}
            </span>
          </div>
          <span className="text-right text-xs text-ink-400">
            {product.variantCount} variants · {product.storageOptions.join(" / ")}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-hairline bg-surface p-10 text-center text-sm text-ink-400">
        No products match that filter yet.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
