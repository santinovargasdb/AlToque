"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { LocateFixed, MapPin, Loader2 } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
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
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          ref={inputRef}
          placeholder="Av. Corrientes 1234, CABA"
          defaultValue={value.addressText}
          onChange={(e) =>
            onChange({ ...value, addressText: e.target.value })
          }
        />
        <button
          type="button"
          onClick={useMyLocation}
          title="Usar mi ubicación"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-primary"
        >
          {locating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LocateFixed className="size-4" />
          )}
        </button>
      </div>

      {HAS_MAPS_KEY && (
        <PlacesBinder inputRef={inputRef} onPlace={onChange} />
      )}

      {hasCoords ? (
        <p className="flex items-center gap-1 text-xs text-success">
          <MapPin className="size-3.5" /> Ubicación lista (
          {value.lat!.toFixed(4)}, {value.lng!.toFixed(4)})
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Elegí una sugerencia o tocá el botón para usar tu ubicación.
        </p>
      )}
    </div>
  );
}

/** Adjunta Google Places Autocomplete al input. Render-null. */
function PlacesBinder({
  inputRef,
  onPlace,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPlace: (v: AddressValue) => void;
}) {
  const places = useMapsLibrary("places");

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name"],
      componentRestrictions: { country: "ar" },
    });
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      onPlace({
        addressText:
          place.formatted_address ?? inputRef.current?.value ?? "",
        lat: loc.lat(),
        lng: loc.lng(),
      });
    });
    return () => listener.remove();
  }, [places, inputRef, onPlace]);

  return null;
}
