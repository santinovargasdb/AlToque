import Link from "next/link";
import { Calendar, Clock, MapPin, Banknote, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { JobStatusTimeline } from "@/components/shared/job-status-timeline";
import { MapView } from "@/components/shared/map-view";
import { formatARS, formatDateTime } from "@/lib/utils";
import type { JobDetail } from "@/lib/db/queries";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

type Counterpart = {
  label: string;
  name: string | null;
  avatar?: string | null;
  rating?: number | null;
  href?: string;
};

export function JobDetailView({
  job,
  counterpart,
  children,
}: {
  job: JobDetail;
  counterpart: Counterpart;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <JobStatusTimeline status={job.status} />

      <section className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-heading text-xl font-bold">{job.title}</h1>
          <Badge variant="secondary">{job.categoryName}</Badge>
        </div>

        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            {job.type === "urgent" ? (
              <>
                <Clock className="size-4 text-action" /> Urgente — lo antes
                posible
              </>
            ) : (
              <>
                <Calendar className="size-4" />
                {job.scheduledAt
                  ? formatDateTime(job.scheduledAt)
                  : "Agendado"}
              </>
            )}
          </p>
          {job.addressText && (
            <p className="flex items-center gap-2">
              <MapPin className="size-4" /> {job.addressText}
            </p>
          )}
          <p className="flex items-center gap-2">
            {job.paymentMethod === "cash" ? (
              <Banknote className="size-4" />
            ) : (
              <CreditCard className="size-4" />
            )}
            {PAYMENT_LABEL[job.paymentMethod]}
          </p>
        </div>

        {job.description && (
          <p className="mt-3 text-sm">{job.description}</p>
        )}

        {job.photos && job.photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {job.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt="Foto del problema"
                className="size-20 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}
      </section>

      {job.lat != null && job.lng != null && (
        <MapView
          center={{ lat: job.lat, lng: job.lng }}
          markers={[{ id: job.id, lat: job.lat, lng: job.lng }]}
          className="h-48 w-full"
        />
      )}

      {/* Contraparte */}
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {counterpart.label}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading font-bold text-primary">
            {counterpart.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={counterpart.avatar}
                alt={counterpart.name ?? ""}
                className="size-full object-cover"
              />
            ) : (
              (counterpart.name ?? "?").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">
                {counterpart.name ?? "—"}
              </span>
              {counterpart.rating != null && <VerifiedBadge />}
            </div>
            {counterpart.rating != null && (
              <RatingStars rating={counterpart.rating} showCount={false} />
            )}
          </div>
          {counterpart.href && (
            <Link
              href={counterpart.href}
              className="text-sm font-medium text-primary"
            >
              Ver perfil
            </Link>
          )}
        </div>
      </section>

      {/* Precio (al completar) */}
      {job.status === "completed" && job.finalPrice && (
        <section className="rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Precio final</span>
            <span className="font-heading text-lg font-bold">
              {formatARS(job.finalPrice)}
            </span>
          </div>
          {job.commissionAmount && (
            <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>Comisión AlToque</span>
              <span>{formatARS(job.commissionAmount)}</span>
            </div>
          )}
        </section>
      )}

      {children}
    </div>
  );
}
