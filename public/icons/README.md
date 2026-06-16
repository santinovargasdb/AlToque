# Íconos PWA

El `manifest.ts` referencia estos PNG (generarlos antes del deploy):

- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `icon-maskable-512.png` — 512×512 (con safe area para máscara)
- `badge-72.png` — 72×72 (badge monocromo para notificaciones push)

## Generarlos rápido

Desde el logo/ícono base (`../logo.svg` o `src/app/icon.svg`):

```bash
npx pwa-asset-generator src/app/icon.svg public/icons \
  --icon-only --favicon --maskable --padding "12%" --background "#2563EB"
```

O manualmente exportando el SVG a PNG en los tamaños indicados.
