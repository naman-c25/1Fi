"use client";

import { useEffect, useState } from "react";

import type { ProductDTO, VariantDTO } from "@/lib/types";

interface Props {
  product: ProductDTO;
  variant: VariantDTO;
  onSelectColor: (colorName: string) => void;
  onSelectStorage: (storage: string) => void;
}

/**
 * The left-hand card: name, artwork, and the colour/storage pickers that
 * decide which variant (and therefore which price) is in play.
 */
export function ProductGallery({ product, variant, onSelectColor, onSelectStorage }: Props) {
  const [imageIndex, setImageIndex] = useState(0);

  // A new colour means a new set of images; start from the hero shot again.
  useEffect(() => {
    setImageIndex(0);
  }, [variant.colorName]);

  const image = variant.images[imageIndex] ?? variant.images[0];

  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
      <header>
        {product.isNew && (
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-500">
            New
          </span>
        )}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-900 sm:text-[34px]">
          {product.name}
        </h1>
        <p className="mt-1 text-lg font-medium text-ink-400">
          <span className="numeric">{variant.storage}</span>
          <span className="mx-2 text-ink-300">·</span>
          <span>{variant.colorName}</span>
        </p>
      </header>

      <div className="relative mt-4 flex h-[340px] items-center justify-center rounded-xl bg-[radial-gradient(ellipse_at_50%_38%,#ffffff_0%,#f2f4f8_72%)] sm:h-[420px]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- local SVG art
          <img
            key={image.url}
            src={image.url}
            alt={image.alt}
            className="animate-rise h-full w-auto object-contain p-3"
          />
        ) : null}
      </div>

      {variant.images.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {variant.images.map((thumb, index) => (
            <button
              key={thumb.url}
              type="button"
              onClick={() => setImageIndex(index)}
              aria-label={thumb.alt}
              aria-current={index === imageIndex}
              className={`h-16 w-14 overflow-hidden rounded-lg border bg-canvas transition-colors ${
                index === imageIndex
                  ? "border-brand-500 ring-2 ring-brand-100"
                  : "border-hairline hover:border-ink-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local SVG art */}
              <img src={thumb.url} alt="" className="h-full w-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}

      {/* Colour picker */}
      <div className="mt-6 text-center">
        <p className="text-sm text-ink-400">
          Available in {product.colors.length} finish{product.colors.length === 1 ? "" : "es"}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          {product.colors.map((color) => {
            const selected = color.name === variant.colorName;
            return (
              <button
                key={color.name}
                type="button"
                onClick={() => onSelectColor(color.name)}
                title={color.name}
                aria-label={color.name}
                aria-pressed={selected}
                className={`grid h-8 w-8 place-items-center rounded-full transition-all ${
                  selected
                    ? "ring-2 ring-brand-600 ring-offset-2"
                    : "ring-1 ring-hairline ring-offset-2 hover:ring-ink-300"
                }`}
              >
                <span
                  aria-hidden
                  className="h-6 w-6 rounded-full border border-black/10 shadow-inner"
                  style={{ backgroundColor: color.hex }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage picker */}
      <div className="mt-6 border-t border-hairline pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Storage</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {product.storageOptions.map((storage) => {
            const selected = storage === variant.storage;
            return (
              <button
                key={storage}
                type="button"
                onClick={() => onSelectStorage(storage)}
                aria-pressed={selected}
                className={`numeric rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-hairline bg-surface text-ink-700 hover:border-ink-300"
                }`}
              >
                {storage}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
