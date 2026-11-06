import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  getJobDetail,
  getJobMessages,
  getJobReviewByAuthor,
  hasDismissedReport,
  hasReportedJob,
} from "@/lib/db/queries";
import { expireStaleUrgentJobs } from "@/lib/jobs/expire";
import {
  isReportableStatus,
  NOT_COMPLETED_CANCEL_REASON,
} from "@/lib/validations/report";
import { ReportJobForm } from "@/components/shared/report-job-form";
import { JobDetailView } from "@/components/app/job-detail-view";
import { ClientJobActions } from "@/components/app/client-job-actions";
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

  await expireStaleUrgentJobs(user.id);
  const job = await getJobDetail(id);
  if (!job || job.clientId !== user.id) notFound();

  const showChat = !!job.providerId && CHAT_STATUSES.includes(job.status);
  const canReport = !!job.providerId && isReportableStatus(job.status);
  const notCompleted =
    job.status === "cancelled" &&
    job.cancelReason === NOT_COMPLETED_CANCEL_REASON;
  const [chatMessages, myReview, alreadyReported, reportDismissed] =
    await Promise.all([
      showChat ? getJobMessages(job.id) : Promise.resolve([]),
      job.status === "completed" || notCompleted
        ? getJobReviewByAuthor(job.id, user.id)
        : Promise.resolve(null),
      canReport ? hasReportedJob(job.id, user.id) : Promise.resolve(false),
      notCompleted ? hasDismissedReport(job.id, user.id) : Promise.resolve(false),
    ]);
  const canReview = job.status === "completed" || (notCompleted && !reportDismissed);

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

      {canReview &&
        job.providerId &&
        (myReview ? (
          <ReviewSummary
            rating={myReview.rating}
            comment={myReview.comment}
            aspects={myReview.aspects}
          />
        ) : (
          <ReviewForm
            jobId={job.id}
            targetId={job.providerId}
            targetLabel={job.providerName ?? "el profesional"}
            direction="client_to_provider"
          />
        ))}

      {canReport && (
        <ReportJobForm jobId={job.id} alreadyReported={alreadyReported} />
      )}
    </JobDetailView>
  );
}
