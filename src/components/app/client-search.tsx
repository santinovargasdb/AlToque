"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapsProvider } from "@/components/shared/maps-provider";
import {
  AddressAutocomplete,
  type AddressValue,
} from "@/components/shared/address-autocomplete";
import { OFICIOS } from "@/lib/constants";

/** Buscador del home cliente: oficio + dirección → /buscar. */
export function ClientSearch({ defaultOficio }: { defaultOficio?: string }) {
  const router = useRouter();
  const [oficio, setOficio] = useState(defaultOficio ?? OFICIOS[0].slug);
  const [address, setAddress] = useState<AddressValue>({ addressText: "" });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (address.lat == null || address.lng == null) {
      toast.error("Elegí una dirección o usá tu ubicación.");
      return;
    }
    const params = new URLSearchParams({
      oficio,
      lat: String(address.lat),
      lng: String(address.lng),
      dir: address.addressText,
    });
    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border border-border bg-card p-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="oficio" className="text-xs font-semibold text-foreground">
          ¿Qué oficio necesitás?
        </Label>
        <select
          id="oficio"
          value={oficio}
          onChange={(e) => setOficio(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          {OFICIOS.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <MapsProvider>
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          label="¿Dónde?"
        />
      </MapsProvider>

      <Button type="submit" size="default" className="w-full">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="size-4 shrink-0"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3.5 3.5" />
        </svg>
        Buscar profesionales
      </Button>
    </form>
  );
}
