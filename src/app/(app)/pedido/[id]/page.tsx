import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  getJobDetail,
  getJobMessages,
  getJobReviewByAuthor,
} from "@/lib/db/queries";
import { JobDetailView } from "@/components/app/job-detail-view";
import { ClientJobActions } from "@/components/app/client-job-actions";
import { JobPaymentPanel } from "@/components/app/job-payment-panel";
import { JobChat } from "@/components/shared/job-chat";
import { ReviewForm } from "@/components/shared/review-form";
import { ReviewSummary } from "@/components/shared/review-summary";
import { PushSubscribe } from "@/components/shared/push-subscribe";

const CHAT_STATUSES = ["accepted", "in_progress", "completed"];

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

  const showChat = !!job.providerId && CHAT_STATUSES.includes(job.status);
  const [chatMessages, myReview] = await Promise.all([
    showChat ? getJobMessages(job.id) : Promise.resolve([]),
    job.status === "completed"
      ? getJobReviewByAuthor(job.id, user.id)
      : Promise.resolve(null),
  ]);

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

      {showChat && (
        <JobChat
          jobId={job.id}
          currentUserId={user.id}
          initialMessages={chatMessages}
          canSend={job.status !== "completed"}
        />
      )}

      <ClientJobActions jobId={job.id} status={job.status} />

      {["broadcasting", "accepted", "in_progress"].includes(job.status) && (
        <PushSubscribe />
      )}

      {job.status === "completed" &&
        job.providerId &&
        (myReview ? (
          <ReviewSummary rating={myReview.rating} comment={myReview.comment} />
        ) : (
          <ReviewForm
            jobId={job.id}
            targetId={job.providerId}
            targetLabel={job.providerName ?? "el profesional"}
          />
        ))}
    </JobDetailView>
  );
}
