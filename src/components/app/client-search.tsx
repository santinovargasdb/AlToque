"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
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
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
    >
      <div className="space-y-1.5">
        <Label htmlFor="oficio">¿Qué oficio necesitás?</Label>
        <select
          id="oficio"
          value={oficio}
          onChange={(e) => setOficio(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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

      <Button type="submit" size="lg" className="w-full">
        <Search className="size-4" />
        Buscar profesionales
      </Button>
    </form>
  );
}
