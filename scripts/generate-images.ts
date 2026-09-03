/**
 * Renders the product artwork referenced by `variant_images`.
 *
 * Each colourway gets a back view (shows off the finish and camera housing)
 * and a front view (screen on). They are generated as SVG rather than shipped
 * as binaries so the repo stays small, the images stay crisp at any size, and
 * nothing hot-links to a CDN that could vanish during a demo.
 *
 *   npm run images:generate
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PRODUCTS, colorSlug, type SeedProduct } from "../prisma/seed-data";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "public", "images");

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}

/** amount > 0 lightens towards white, < 0 darkens towards black. */
function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return rgbToHex({
    r: r + (target - r) * t,
    g: g + (target - g) * t,
    b: b + (target - b) * t,
  });
}

/** Perceived brightness, used to pick contrasting details on light bodies. */
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const W = 460;
const H = 620;
const PHONE_W = 232;
const PHONE_H = 482;
const PHONE_X = (W - PHONE_W) / 2;
const PHONE_Y = 62;
const RADIUS = 40;

interface LensOptions {
  cx: number;
  cy: number;
  r: number;
  id: string;
}

function lens({ cx, cy, r, id }: LensOptions): string {
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#2b2d31" />
    <circle cx="${cx}" cy="${cy}" r="${r - 2.5}" fill="url(#glass-${id})" />
    <circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="#0b0d10" />
    <circle cx="${cx - r * 0.3}" cy="${cy - r * 0.32}" r="${r * 0.16}" fill="#ffffff" opacity="0.45" />`;
}

function cameraModule(style: SeedProduct["cameraStyle"], body: string): string {
  const housing = shade(body, luminance(body) > 0.6 ? -0.08 : 0.06);
  const housingStroke = shade(body, -0.22);
  const left = PHONE_X + 20;
  const top = PHONE_Y + 20;

  switch (style) {
    case "square-triple": {
      const size = 116;
      const cx1 = left + 38;
      const cy1 = top + 36;
      return `
    <rect x="${left}" y="${top}" width="${size}" height="${size}" rx="32"
          fill="${housing}" stroke="${housingStroke}" stroke-width="1.5" />
    ${lens({ cx: cx1, cy: cy1, r: 20, id: "a" })}
    ${lens({ cx: cx1 + 42, cy: cy1, r: 20, id: "b" })}
    ${lens({ cx: cx1, cy: cy1 + 44, r: 20, id: "c" })}
    <circle cx="${cx1 + 42}" cy="${cy1 + 44}" r="8" fill="#f3efdf" opacity="0.9" />`;
    }

    case "pill-triple": {
      // Samsung-style: bare lenses, no housing plate.
      const cx = left + 30;
      return `
    ${lens({ cx, cy: top + 26, r: 21, id: "a" })}
    ${lens({ cx, cy: top + 76, r: 18, id: "b" })}
    ${lens({ cx, cy: top + 120, r: 16, id: "c" })}
    <rect x="${cx + 34}" y="${top + 18}" width="12" height="26" rx="6" fill="#f3efdf" opacity="0.8" />`;
    }

    case "bar-dual": {
      // Pixel-style camera bar spanning the body.
      const barY = PHONE_Y + 84;
      return `
    <rect x="${PHONE_X - 2}" y="${barY}" width="${PHONE_W + 4}" height="60" rx="30"
          fill="${housing}" stroke="${housingStroke}" stroke-width="1.5" />
    ${lens({ cx: PHONE_X + 62, cy: barY + 30, r: 21, id: "a" })}
    ${lens({ cx: PHONE_X + 116, cy: barY + 30, r: 21, id: "b" })}
    <rect x="${PHONE_X + 150}" y="${barY + 20}" width="34" height="20" rx="10" fill="#1d1f22" opacity="0.85" />`;
    }

    case "circle-dual":
    default: {
      const cx = left + 58;
      const cy = top + 58;
      return `
    <circle cx="${cx}" cy="${cy}" r="60" fill="${housing}" stroke="${housingStroke}" stroke-width="1.5" />
    ${lens({ cx: cx - 24, cy: cy - 20, r: 19, id: "a" })}
    ${lens({ cx: cx + 24, cy: cy - 20, r: 19, id: "b" })}
    ${lens({ cx: cx - 24, cy: cy + 26, r: 15, id: "c" })}
    <circle cx="${cx + 24}" cy="${cy + 26}" r="7" fill="#f3efdf" opacity="0.9" />`;
    }
  }
}

const LENS_GRADIENTS = ["a", "b", "c"]
  .map(
    (id) => `
    <radialGradient id="glass-${id}" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#4a5568" />
      <stop offset="45%" stop-color="#1a1d23" />
      <stop offset="100%" stop-color="#05070a" />
    </radialGradient>`,
  )
  .join("");

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

function backView(product: SeedProduct, colorName: string, bodyHex: string): string {
  const light = shade(bodyHex, 0.22);
  const dark = shade(bodyHex, -0.24);
  const edge = shade(bodyHex, -0.42);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
     role="img" aria-label="${product.name} in ${colorName}, rear view">
  <defs>
    <linearGradient id="body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${light}" />
      <stop offset="38%" stop-color="${bodyHex}" />
      <stop offset="100%" stop-color="${dark}" />
    </linearGradient>
    <linearGradient id="gloss" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.30" />
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.04" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
    </radialGradient>${LENS_GRADIENTS}
  </defs>

  <ellipse cx="${W / 2}" cy="${PHONE_Y + PHONE_H + 26}" rx="${PHONE_W * 0.62}" ry="26" fill="url(#shadow)" />

  <rect x="${PHONE_X}" y="${PHONE_Y}" width="${PHONE_W}" height="${PHONE_H}" rx="${RADIUS}"
        fill="url(#body)" stroke="${edge}" stroke-width="2" />
  <rect x="${PHONE_X + 3}" y="${PHONE_Y + 3}" width="${PHONE_W - 6}" height="${PHONE_H - 6}"
        rx="${RADIUS - 3}" fill="none" stroke="${light}" stroke-width="1" opacity="0.55" />
  <rect x="${PHONE_X}" y="${PHONE_Y}" width="${PHONE_W * 0.5}" height="${PHONE_H}" rx="${RADIUS}"
        fill="url(#gloss)" />

  ${cameraModule(product.cameraStyle, bodyHex)}

  <!-- side buttons -->
  <rect x="${PHONE_X - 3}" y="${PHONE_Y + 150}" width="3" height="54" rx="1.5" fill="${edge}" />
  <rect x="${PHONE_X - 3}" y="${PHONE_Y + 216}" width="3" height="54" rx="1.5" fill="${edge}" />
  <rect x="${PHONE_X + PHONE_W}" y="${PHONE_Y + 178}" width="3" height="76" rx="1.5" fill="${edge}" />
</svg>
`;
}

function frontView(product: SeedProduct, colorName: string, bodyHex: string, accentHex: string): string {
  const frame = shade(bodyHex, -0.3);
  const frameLight = shade(bodyHex, 0.1);
  const wallpaperTop = shade(accentHex, 0.18);
  const wallpaperBottom = shade(accentHex, -0.45);
  const inset = 9;
  const sx = PHONE_X + inset;
  const sy = PHONE_Y + inset;
  const sw = PHONE_W - inset * 2;
  const sh = PHONE_H - inset * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
     role="img" aria-label="${product.name} in ${colorName}, front view">
  <defs>
    <linearGradient id="frame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${frameLight}" />
      <stop offset="50%" stop-color="${frame}" />
      <stop offset="100%" stop-color="${shade(bodyHex, -0.5)}" />
    </linearGradient>
    <linearGradient id="wallpaper" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="${wallpaperTop}" />
      <stop offset="55%" stop-color="${accentHex}" />
      <stop offset="100%" stop-color="${wallpaperBottom}" />
    </linearGradient>
    <radialGradient id="bloom" cx="30%" cy="22%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.42" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
    </radialGradient>
    <clipPath id="screen-clip">
      <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${RADIUS - inset}" />
    </clipPath>
  </defs>

  <ellipse cx="${W / 2}" cy="${PHONE_Y + PHONE_H + 26}" rx="${PHONE_W * 0.62}" ry="26" fill="url(#shadow)" />

  <rect x="${PHONE_X}" y="${PHONE_Y}" width="${PHONE_W}" height="${PHONE_H}" rx="${RADIUS}"
        fill="url(#frame)" stroke="${shade(bodyHex, -0.55)}" stroke-width="2" />

  <g clip-path="url(#screen-clip)">
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="url(#wallpaper)" />
    <circle cx="${sx + sw * 0.28}" cy="${sy + sh * 0.2}" r="${sw * 0.55}" fill="url(#bloom)" />
    <circle cx="${sx + sw * 0.85}" cy="${sy + sh * 0.72}" r="${sw * 0.42}" fill="#ffffff" opacity="0.10" />
    <circle cx="${sx + sw * 0.1}" cy="${sy + sh * 0.88}" r="${sw * 0.36}" fill="#000000" opacity="0.12" />

    <!-- abstract lock-screen furniture -->
    <rect x="${sx + sw * 0.22}" y="${sy + sh * 0.13}" width="${sw * 0.56}" height="26" rx="13"
          fill="#ffffff" opacity="0.28" />
    <rect x="${sx + sw * 0.34}" y="${sy + sh * 0.21}" width="${sw * 0.32}" height="12" rx="6"
          fill="#ffffff" opacity="0.20" />
    <rect x="${sx + sw * 0.12}" y="${sy + sh * 0.74}" width="${sw * 0.76}" height="54" rx="18"
          fill="#ffffff" opacity="0.16" />
    <rect x="${sx + sw * 0.3}" y="${sy + sh * 0.93}" width="${sw * 0.4}" height="6" rx="3"
          fill="#ffffff" opacity="0.5" />
  </g>

  <!-- dynamic island / punch hole -->
  <rect x="${W / 2 - 38}" y="${sy + 14}" width="76" height="24" rx="12" fill="#080a0d" />
  <circle cx="${W / 2 + 22}" cy="${sy + 26}" r="6" fill="#161a20" />

  <rect x="${PHONE_X + 3}" y="${PHONE_Y + 3}" width="${PHONE_W - 6}" height="${PHONE_H - 6}"
        rx="${RADIUS - 3}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.22" />
</svg>
`;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let written = 0;
  for (const product of PRODUCTS) {
    for (const color of product.colors) {
      const slug = colorSlug(color.name);
      const files: [string, string][] = [
        [`${product.slug}-${slug}-back.svg`, backView(product, color.name, color.hex)],
        [
          `${product.slug}-${slug}-front.svg`,
          frontView(product, color.name, color.hex, color.accentHex),
        ],
      ];

      for (const [name, svg] of files) {
        await writeFile(join(OUT_DIR, name), svg, "utf8");
        written += 1;
      }
    }
  }

  console.log(`Generated ${written} images into public/images`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
