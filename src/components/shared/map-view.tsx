"use client";

import { Map, Marker } from "@vis.gl/react-google-maps";
import { MapPinned } from "lucide-react";
import { MapsProvider, HAS_MAPS_KEY } from "./maps-provider";

export type MapMarker = { id: string; lat: number; lng: number };

/**
 * Mapa con la ubicación de búsqueda + marcadores de profesionales.
 * Si no hay API key de Google Maps, muestra un placeholder (la lista de
 * resultados sigue funcionando igual).
 */
export function MapView({
  center,
  markers = [],
  className = "h-64 w-full",
}: {
  center: { lat: number; lng: number };
  markers?: MapMarker[];
  className?: string;
}) {
  if (!HAS_MAPS_KEY) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-center text-muted-foreground ${className}`}
      >
        <MapPinned className="size-7" />
        <p className="text-sm">
          Configurá <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para ver el
          mapa.
        </p>
      </div>
    );
  }

  return (
    <MapsProvider>
      <div className={`overflow-hidden rounded-xl border border-border ${className}`}>
        <Map
          defaultCenter={center}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
        >
          {markers.map((m) => (
            <Marker key={m.id} position={{ lat: m.lat, lng: m.lng }} />
          ))}
        </Map>
      </div>
    </MapsProvider>
  );
}
