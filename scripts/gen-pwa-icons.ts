/**
 * Genera los PNG del manifest PWA una sola vez.
 * Correr con: pnpm tsx scripts/gen-pwa-icons.ts
 *
 * Diseño: cuadrado #2563EB con rayo (Zap) blanco centrado.
 * El rayo usa las mismas coordenadas que public/logo.svg escaladas a viewBox 100×100.
 */
import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const ICONS_DIR = join(process.cwd(), "public", "icons");
mkdirSync(ICONS_DIR, { recursive: true });

// Rayo original de logo.svg: M18 10l-7 11h5l-1 9 7-12h-5l1-8z
// Bounding box: x=11..22 (w=11), y=10..30 (h=20)
// En viewBox 100×100: scale=3, translate(0.5,-10) → ocupa x≈33-67, y=20-80

function iconSvg({
  rx = 15,
  scale = 3,
  tx = 0.5,
  ty = -10,
}: {
  rx?: number;
  scale?: number;
  tx?: number;
  ty?: number;
}) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="${rx}" fill="#2563EB"/>
  <path transform="translate(${tx},${ty}) scale(${scale})"
        d="M18 10l-7 11h5l-1 9 7-12h-5l1-8z"
        fill="white"/>
</svg>`;
}

// Para badge-72: fondo transparente, rayo blanco (notificaciones push monocromas)
function badgeSvg() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path transform="translate(0.5,-10) scale(3)"
        d="M18 10l-7 11h5l-1 9 7-12h-5l1-8z"
        fill="white"/>
</svg>`;
}

const icons = [
  // any: rayo ocupa ~60% de alto, rx proporcional al del logo
  { file: "icon-192.png",          size: 192, svg: iconSvg({ rx: 15 }) },
  { file: "icon-512.png",          size: 512, svg: iconSvg({ rx: 15 }) },
  // maskable: rayo más chico (scale=2) para respetar la safe zone del 80%
  // sin rx para que el OS aplique su propia máscara (círculo, squircle, etc.)
  { file: "icon-maskable-512.png", size: 512, svg: iconSvg({ rx: 0, scale: 2, tx: 17, ty: 10 }) },
  // badge push: 72×72 monocromo, fondo transparente
  { file: "badge-72.png",          size: 72,  svg: badgeSvg() },
] as const;

for (const { file, size, svg } of icons) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(ICONS_DIR, file));
  console.log(`✓  ${file}  (${size}×${size})`);
}

console.log("\nTodos los íconos generados en public/icons/");
