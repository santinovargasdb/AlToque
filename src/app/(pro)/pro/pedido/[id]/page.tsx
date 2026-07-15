import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  getJobDetail,
  getJobMessages,
  getJobReviewByAuthor,
} from "@/lib/db/queries";
import { JobDetailView } from "@/components/app/job-detail-view";
import { ProviderJobActions } from "@/components/pro/provider-job-actions";
import { JobChat } from "@/components/shared/job-chat";
import { ReviewForm } from "@/components/shared/review-form";
import { ReviewSummary } from "@/components/shared/review-summary";

const CHAT_STATUSES = ["accepted", "in_progress", "completed"];

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

  const showChat = CHAT_STATUSES.includes(job.status);
  const [chatMessages, myReview] = await Promise.all([
    showChat ? getJobMessages(job.id) : Promise.resolve([]),
    job.status === "completed"
      ? getJobReviewByAuthor(job.id, user.id)
      : Promise.resolve(null),
  ]);

  return (
    <JobDetailView
      job={job}
      counterpart={{ label: "Cliente", name: job.clientName }}
    >
      {showChat && (
        <JobChat
          jobId={job.id}
          currentUserId={user.id}
          initialMessages={chatMessages}
          canSend={job.status !== "completed"}
        />
      )}

      <ProviderJobActions
        jobId={job.id}
        status={job.status}
        paymentMethod={job.paymentMethod}
        paymentStatus={job.paymentStatus}
      />

      {job.status === "completed" &&
        (myReview ? (
          <ReviewSummary rating={myReview.rating} comment={myReview.comment} />
        ) : (
          <ReviewForm
            jobId={job.id}
            targetId={job.clientId}
            targetLabel={job.clientName ?? "el cliente"}
          />
        ))}
    </JobDetailView>
  );
}
