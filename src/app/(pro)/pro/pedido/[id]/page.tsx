import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getJobDetail } from "@/lib/db/queries";
import { JobDetailView } from "@/components/app/job-detail-view";
import { ProviderJobActions } from "@/components/pro/provider-job-actions";

export default async function ProviderJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole("provider");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const job = await getJobDetail(id);
  if (!job || job.providerId !== user.id) notFound();

  return (
    <JobDetailView
      job={job}
      counterpart={{ label: "Cliente", name: job.clientName }}
    >
      <ProviderJobActions
        jobId={job.id}
        status={job.status}
        paymentMethod={job.paymentMethod}
        paymentStatus={job.paymentStatus}
      />
    </JobDetailView>
  );
}
