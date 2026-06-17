"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Banknote, CreditCard } from "lucide-react";
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
  const [priceEstimate, setPriceEstimate] = useState("");

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
    const estimate = Number(priceEstimate);
    if (payment !== "cash" && (!Number.isFinite(estimate) || estimate <= 0)) {
      return toast.error("Ingresá un precio estimado para pagar por la app.");
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
        priceEstimate: payment !== "cash" ? estimate : undefined,
        providerId: isBroadcast ? undefined : providerId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.redirectUrl) {
        // Pago prepago: ir a Checkout Pro de Mercado Pago.
        window.location.href = res.redirectUrl;
        return;
      }
      toast.success("¡Pedido creado!");
      router.push(`/pedido/${res.jobId}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Pedido para</span>
        <span className="font-medium text-foreground">{providerName}</span>
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
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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

          <div className="space-y-2">
            <Label>¿Cómo pagás?</Label>
            <div className="grid gap-2">
              <PaymentOption
                active={payment === "cash"}
                onClick={() => setPayment("cash")}
                icon={<Banknote className="size-5" />}
                title="Efectivo"
                desc="Coordinás el pago con el profesional"
              />
              <PaymentOption
                active={payment === "transfer"}
                onClick={() => setPayment("transfer")}
                icon={<CreditCard className="size-5" />}
                title="Transferencia / Tarjeta"
                desc="Por la app con Mercado Pago"
              />
            </div>
            {payment !== "cash" && (
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="estimate">Precio estimado (ARS)</Label>
                <Input
                  id="estimate"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="Ej: 15000"
                  value={priceEstimate}
                  onChange={(e) => setPriceEstimate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lo pagás ahora y queda retenido hasta completar el trabajo.
                </p>
              </div>
            )}
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
            <ArrowLeft className="size-4" /> Atrás
          </Button>
        )}
        {step < 3 ? (
          <Button type="button" className="flex-1" onClick={next}>
            Continuar <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1"
            onClick={submit}
            disabled={pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
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
        "rounded-xl border p-3 text-left transition-colors",
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
        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
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
