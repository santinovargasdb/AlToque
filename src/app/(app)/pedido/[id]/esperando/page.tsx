import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getJobDetail } from "@/lib/db/queries";
import { EsperandoView } from "@/components/app/esperando-view";

export default async function EsperandoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole("client");
  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) notFound();

  const job = await getJobDetail(id);
  if (!job || job.clientId !== user.id) notFound();

  if (job.status !== "broadcasting") {
    redirect(`/pedido/${id}`);
  }

  return (
    <EsperandoView
      jobId={id}
      initialJob={{
        title: job.title,
        categoryName: job.categoryName,
        addressText: job.addressText,
      }}
    />
  );
}
