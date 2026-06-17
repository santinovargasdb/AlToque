import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getJobDetail } from "@/lib/db/queries";
import { JobDetailView } from "@/components/app/job-detail-view";
import { ClientJobActions } from "@/components/app/client-job-actions";
import { JobPaymentPanel } from "@/components/app/job-payment-panel";
import { PushSubscribe } from "@/components/shared/push-subscribe";

export default async function ClientJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole("client");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const job = await getJobDetail(id);
  if (!job || job.clientId !== user.id) notFound();

  return (
    <JobDetailView
      job={job}
      counterpart={{
        label: "Profesional",
        name: job.providerName,
        avatar: job.providerAvatar,
        rating: job.providerRating,
        href: job.providerId ? `/profesional/${job.providerId}` : undefined,
      }}
    >
      <JobPaymentPanel
        paymentMethod={job.paymentMethod}
        paymentStatus={job.paymentStatus}
        mpPreferenceId={job.mpPreferenceId}
      />

      <ClientJobActions jobId={job.id} status={job.status} />

      {["broadcasting", "accepted", "in_progress"].includes(job.status) && (
        <PushSubscribe />
      )}

      {job.status === "completed" && (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Dejá tu reseña — disponible en el Step 10.
        </p>
      )}
    </JobDetailView>
  );
}
