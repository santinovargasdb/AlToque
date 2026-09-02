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
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-primary"
        >
          {locating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LocateFixed className="size-4" />
          )}
        </button>
      </div>

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

/**
 * Monta PlaceAutocompleteElement (Web Component de la nueva Places API)
 * una vez que la librería Places está disponible. Render-null hasta entonces.
 *
 * Se usa `useMapsLibrary("places")` para esperar que vis.gl cargue la
 * librería; el efecto corre solo cuando `places` resuelve (≡ importLibrary).
 * `onChange` va en un ref para que cambios de closure no fuercen re-mount
 * del elemento (mismo patrón que useRealtimeChannel).
 */
function PlacesInput({
  id,
  initialAddress,
  onChange,
}: {
  id: string;
  initialAddress: string;
  onChange: (v: AddressValue) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const places = useMapsLibrary("places");

  useEffect(() => {
    const container = containerRef.current;
    if (!places || !container) return;

    const element = new places.PlaceAutocompleteElement({
      includedRegionCodes: ["AR"],
      requestedLanguage: "es",
      requestedRegion: "ar",
    });
    element.id = id;
    element.placeholder = "Av. Corrientes 1234, CABA";
    element.noInputIcon = true;
    if (initialAddress) element.value = initialAddress;

    function handler(event: google.maps.places.PlacePredictionSelectEvent) {
      const place = event.placePrediction.toPlace();
      void place
        .fetchFields({ fields: ["formattedAddress", "location"] })
        .then(() => {
          onChangeRef.current({
            addressText: place.formattedAddress ?? element.value ?? "",
            lat: place.location?.lat(),
            lng: place.location?.lng(),
          });
        });
    }

    element.addEventListener("gmp-select", handler);
    container.appendChild(element);

    return () => {
      // removeEventListener no tiene el overload tipado de PlaceAutocompleteElement;
      // el cast a EventListener es seguro porque el handler solo recibe gmp-select.
      element.removeEventListener("gmp-select", handler as EventListener);
      element.remove();
    };
    // id e initialAddress son estables: id viene de useId() (constante por
    // instancia) e initialAddress se aplica solo al montar, como defaultValue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  return <div ref={containerRef} className="flex-1" />;
}
