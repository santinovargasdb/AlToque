# Íconos PWA

Generados desde la marca AlToque (cuadrado azul `#2563EB` + rayo naranja `#F97316`, misma identidad que `src/app/icon.svg`). Ya presentes:

- `icon-192.png`: 192×192 (purpose `any`, full-bleed)
- `icon-512.png`: 512×512 (purpose `any`, full-bleed)
- `icon-maskable-512.png`: 512×512 (purpose `maskable`; rayo reducido dentro de la safe-zone para que el recorte adaptativo no lo corte)
- `badge-72.png`: 72×72 (silueta blanca sobre transparente para el badge de notificaciones push; el sistema lo tiñe)

## Regenerarlos

Si cambia la marca, exportá de nuevo desde `src/app/icon.svg` a los tamaños de arriba. Opción rápida:

```bash
npx pwa-asset-generator src/app/icon.svg public/icons \
  --icon-only --favicon --maskable --padding "12%" --background "#2563EB"
```

O rasterizando el SVG a PNG manualmente (p. ej. con `sharp` o un `<canvas>`) en los tamaños indicados.
