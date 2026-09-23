"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { JobPhotosUploader } from "./job-photos-uploader";
import { createJob } from "@/lib/actions/job";

type Category = { id: string; name: string };
type PaymentMethod = "cash" | "transfer" | "card";

export function NewOrderWizard({
  userId,
  mode = "direct",
  providerId,
  providerName,
  categories,
  defaultCategoryId,
  initialAddress,
}: {
  userId: string;
  mode?: "direct" | "broadcast";
  providerId?: string;
  providerName?: string;
  categories: Category[];
  defaultCategoryId?: string;
  initialAddress?: AddressValue;
}) {
  const router = useRouter();
  const isBroadcast = mode === "broadcast";
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(1);

  const [categoryId, setCategoryId] = useState(
    defaultCategoryId ?? categories[0]?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState<AddressValue>(
    initialAddress ?? { addressText: "" },
  );
  const [type, setType] = useState<"scheduled" | "urgent">(
    isBroadcast ? "urgent" : "scheduled",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");

  function next() {
    if (step === 1) {
      if (!categoryId) return toast.error("Elegí un oficio.");
      if (title.trim().length < 3) return toast.error("Escribí un título.");
    }
    if (step === 2 && (address.lat == null || address.lng == null)) {
      return toast.error("Indicá dónde es el trabajo.");
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function submit() {
    if (type === "scheduled" && !scheduledAt) {
      return toast.error("Elegí fecha y hora.");
    }
    startTransition(async () => {
      const res = await createJob({
        categoryId,
        type,
        title,
        description: description || undefined,
        photos,
        addressText: address.addressText,
        lat: address.lat,
        lng: address.lng,
        scheduledAt: type === "scheduled" ? scheduledAt : undefined,
        paymentMethod: payment,
        providerId: isBroadcast ? undefined : providerId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isBroadcast ? "¡Buscando profesional!" : "¡Pedido creado!");
      router.push(isBroadcast ? `/pedido/${res.jobId}/esperando` : `/pedido/${res.jobId}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {!isBroadcast && (
          <>
            <span>Pedido para</span>
            <span className="font-medium text-foreground">{providerName}</span>
          </>
        )}
        <span className="ml-auto">Paso {step} de 3</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat">Oficio</Label>
            <select
              id="cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">¿Qué necesitás?</Label>
            <Input
              id="title"
              placeholder="Ej: Pérdida de agua en la cocina"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Detalle (opcional)</Label>
            <Textarea
              id="desc"
              placeholder="Contá más sobre el problema."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fotos (opcional)</Label>
            <JobPhotosUploader
              userId={userId}
              value={photos}
              onChange={setPhotos}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <MapsProvider>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            label="¿Dónde es el trabajo?"
          />
        </MapsProvider>
      )}

      {step === 3 && (
        <div className="space-y-5">
          {!isBroadcast && (
            <div className="space-y-2">
              <Label>¿Cuándo?</Label>
              <div className="grid grid-cols-2 gap-2">
                <TypeOption
                  active={type === "scheduled"}
                  onClick={() => setType("scheduled")}
                  title="Agendado"
                  desc="Elegís día y hora"
                />
                <TypeOption
                  active={type === "urgent"}
                  onClick={() => setType("urgent")}
                  title="Urgente"
                  desc="Lo antes posible"
                />
              </div>
              {type === "scheduled" && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>¿Cómo pensás pagar?</Label>
            <div className="grid gap-2">
              <PaymentOption
                active={payment === "cash"}
                onClick={() => setPayment("cash")}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="12" x="2" y="6" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                }
                title="Efectivo"
                desc="Le pagás en mano al profesional"
              />
              <PaymentOption
                active={payment === "transfer"}
                onClick={() => setPayment("transfer")}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                  </svg>
                }
                title="Transferencia / Tarjeta"
                desc="Lo acordás directamente con el profesional"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              El pago se acuerda entre vos y el profesional; AlToque no
              participa del cobro.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={pending}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Atrás
          </Button>
        )}
        {step < 3 ? (
          <Button type="button" className="flex-1" onClick={next}>
            Continuar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1"
            onClick={submit}
            disabled={pending}
          >
            {pending && (
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            Confirmar pedido
          </Button>
        )}
      </div>
    </div>
  );
}

function TypeOption({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border p-3 text-left transition-colors duration-150",
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      <span className="block font-medium">{title}</span>
      <span className="block text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}

function PaymentOption({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md border p-3 text-left transition-colors duration-150",
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}
