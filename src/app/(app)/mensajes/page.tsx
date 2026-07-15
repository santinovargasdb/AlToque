import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs, messages, profiles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Mensajes" };

const STATUS_LABEL = {
  accepted: "Aceptado",
  in_progress: "En curso",
  completed: "Completado",
} as const;

type ChatStatus = keyof typeof STATUS_LABEL;

/** Conversaciones del cliente: un chat por pedido con profesional asignado. */
export default async function MensajesPage() {
  const { user } = await requireRole("client");

  const conversations = await db
    .select({
      jobId: jobs.id,
      title: jobs.title,
      status: jobs.status,
      updatedAt: jobs.updatedAt,
      providerName: profiles.fullName,
      providerAvatar: profiles.avatarUrl,
    })
    .from(jobs)
    .innerJoin(profiles, eq(profiles.id, jobs.providerId))
    .where(
      and(
        eq(jobs.clientId, user.id),
        isNotNull(jobs.providerId),
        inArray(jobs.status, ["accepted", "in_progress", "completed"]),
      ),
    )
    .orderBy(desc(jobs.updatedAt))
    .limit(50);

  const jobIds = conversations.map((c) => c.jobId);
  const lastMessages = jobIds.length
    ? await db
        .selectDistinctOn([messages.jobId], {
          jobId: messages.jobId,
          body: messages.body,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(inArray(messages.jobId, jobIds))
        .orderBy(messages.jobId, desc(messages.createdAt))
    : [];
  const lastByJob = new Map(lastMessages.map((m) => [m.jobId, m]));

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">Mensajes</h1>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <MessageSquare className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Cuando un profesional acepte tu pedido vas a poder chatear con él
            desde acá.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => {
            const last = lastByJob.get(c.jobId);
            return (
              <li key={c.jobId}>
                <Link
                  href={`/pedido/${c.jobId}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading font-bold text-primary">
                    {c.providerAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.providerAvatar}
                        alt={c.providerName ?? ""}
                        className="size-full object-cover"
                      />
                    ) : (
                      (c.providerName ?? "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {c.providerName ?? "Profesional"}
                      </span>
                      <Badge
                        variant={c.status === "completed" ? "secondary" : "default"}
                      >
                        {STATUS_LABEL[c.status as ChatStatus]}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {last ? last.body : c.title}
                    </p>
                    {last && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(last.createdAt)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
