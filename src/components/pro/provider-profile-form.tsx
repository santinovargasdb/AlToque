"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MapsProvider } from "@/components/shared/maps-provider";
import {
  AddressAutocomplete,
  type AddressValue,
} from "@/components/shared/address-autocomplete";
import { updateProviderProfile } from "@/lib/actions/provider";

type CategoryOption = { id: string; name: string };

type Initial = {
  categoryIds: string[];
  serviceRadiusKm: number;
  bio: string;
  yearsExperience: number | null;
  lat: number | null;
  lng: number | null;
};

export function ProviderProfileForm({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial.categoryIds),
  );
  const [address, setAddress] = useState<AddressValue>({
    addressText: "",
    lat: initial.lat ?? undefined,
    lng: initial.lng ?? undefined,
  });
  const [radius, setRadius] = useState(initial.serviceRadiusKm);
  const [bio, setBio] = useState(initial.bio);
  const [years, setYears] = useState<string>(
    initial.yearsExperience != null ? String(initial.yearsExperience) : "",
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      toast.error("Elegí al menos un oficio.");
      return;
    }
    startTransition(async () => {
      const res = await updateProviderProfile({
        categoryIds: [...selected],
        addressText: address.addressText,
        lat: address.lat,
        lng: address.lng,
        serviceRadiusKm: radius,
        bio: bio || undefined,
        yearsExperience: years ? Number(years) : undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Perfil guardado.");
      router.push("/pro/verificacion");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-2">
        <Label>¿Qué oficios ofrecés?</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <MapsProvider>
        <AddressAutocomplete value={address} onChange={setAddress} />
      </MapsProvider>

      <div className="space-y-1.5">
        <Label htmlFor="radius">Radio de cobertura: {radius} km</Label>
        <input
          id="radius"
          type="range"
          min={1}
          max={50}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div className="space-y-1.5">
          <Label htmlFor="bio">Sobre vos (opcional)</Label>
          <Textarea
            id="bio"
            placeholder="Contá tu experiencia, especialidades, etc."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={1000}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="years">Años de exp.</Label>
          <Input
            id="years"
            type="number"
            min={0}
            max={80}
            inputMode="numeric"
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Guardar y continuar
      </Button>
    </form>
  );
}
