"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Envuelve a sus hijos en el APIProvider de Google Maps solo si hay API key.
 * Sin key, renderiza los hijos tal cual (el AddressAutocomplete cae a
 * geolocalización del navegador). Usar alrededor de formularios con mapas,
 * no global, para no cargar Maps en toda la app.
 */
export function MapsProvider({ children }: { children: React.ReactNode }) {
  if (!KEY) return <>{children}</>;
  return (
    <APIProvider apiKey={KEY} libraries={["places"]} language="es" region="AR">
      {children}
    </APIProvider>
  );
}

export const HAS_MAPS_KEY = !!KEY;
