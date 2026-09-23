"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HAS_MAPS_KEY } from "./maps-provider";

export type AddressValue = { addressText: string; lat?: number; lng?: number };

/**
 * Input de dirección con Google Places Autocomplete (si hay API key) y
 * fallback a la geolocalización del navegador. Emite { addressText, lat, lng }.
 * Debe usarse dentro de <MapsProvider>.
 */
export function AddressAutocomplete({
  value,
  onChange,
  label = "Dirección o zona de trabajo",
}: {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  label?: string;
}) {
  const id = useId();
  const [locating, setLocating] = useState(false);
  const hasCoords = value.lat != null && value.lng != null;

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({
          addressText: value.addressText || "Mi ubicación actual",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        toast.success("Ubicación detectada.");
      },
      () => {
        setLocating(false);
        toast.error("No pudimos acceder a tu ubicación.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
      </Label>
      <div className="flex gap-2">
        {HAS_MAPS_KEY ? (
          <PlacesInput
            id={id}
            initialAddress={value.addressText}
            onChange={onChange}
          />
        ) : (
          <Input
            id={id}
            placeholder="Av. Corrientes 1234, CABA"
            defaultValue={value.addressText}
            onChange={(e) => onChange({ ...value, addressText: e.target.value })}
          />
        )}
        <button
          type="button"
          onClick={useMyLocation}
          title="Usar mi ubicación"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-input bg-card text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {locating ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 animate-spin opacity-70">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4">
              <circle cx="8" cy="8" r="6" />
              <circle cx="8" cy="8" r="2" />
              <path d="M8 0v2M8 14v2M0 8h2M14 8h2" />
            </svg>
          )}
        </button>
      </div>

      {hasCoords ? (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3.5 shrink-0">
            <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5a4.5 4.5 0 0 0-4.5-4.5Z" />
            <circle cx="8" cy="6" r="1.5" />
          </svg>
          <span className="font-mono">
            Ubicación lista ({value.lat!.toFixed(4)}, {value.lng!.toFixed(4)})
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Elegí una sugerencia o tocá el botón para usar tu ubicación.
        </p>
      )}
    </div>
  );
}

/**
 * Monta PlaceAutocompleteElement (Web Component de la nueva Places API)
 * una vez que la librería Places está disponible. Render-null hasta entonces.
 */
function PlacesInput({
  id,
  initialAddress,
  onChange,
}: {
  id: string;
  initialAddress?: string;
  onChange: (v: AddressValue) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const places = useMapsLibrary("places");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!places || !containerRef.current) return;

    const el = new places.PlaceAutocompleteElement({
      componentRestrictions: { country: ["ar"] },
    });
    el.id = id;

    const listener = async () => {
      const place = el.getPlace?.() ?? (el as unknown as { value?: google.maps.places.Place }).value;
      if (!place) return;

      try {
        if (typeof place.fetchFields === "function") {
          await place.fetchFields({
            fields: ["displayName", "formattedAddress", "location"],
          });
        }
      } catch (err) {
        console.warn("fetchFields falló, usando propiedades directas:", err);
      }

      const addressText =
        place.formattedAddress ??
        place.displayName ??
        (el as unknown as { value?: string }).value ??
        "";
      const lat =
        typeof place.location?.lat === "function"
          ? place.location.lat()
          : (place.location?.lat as unknown as number | undefined);
      const lng =
        typeof place.location?.lng === "function"
          ? place.location.lng()
          : (place.location?.lng as unknown as number | undefined);

      onChangeRef.current({ addressText, lat, lng });
    };

    el.addEventListener("gmp-placeselect", listener);

    const container = containerRef.current;
    container.replaceChildren(el);

    if (initialAddress) {
      setTimeout(() => {
        const input = el.shadowRoot?.querySelector("input");
        if (input && !input.value) input.value = initialAddress;
      }, 50);
    }

    return () => {
      el.removeEventListener("gmp-placeselect", listener);
      container.replaceChildren();
    };
  }, [places, id, initialAddress]);

  return <div ref={containerRef} className="flex-1" />;
}
