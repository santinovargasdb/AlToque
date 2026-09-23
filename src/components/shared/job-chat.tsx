"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sendMessage, type SentMessage } from "@/lib/actions/message";

/** Fila de `messages` como llega por Realtime (snake_case). */
type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const TIME = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Chat en vivo del trabajo (Step 11). Mensajes iniciales por SSR; los nuevos
 * llegan por Supabase Realtime (INSERT en `messages`, autorizado por RLS:
 * solo las partes del job). El propio envío se agrega optimistamente con la
 * fila devuelta por la Server Action y se dedupe por id.
 */
export function JobChat({
  jobId,
  currentUserId,
  initialMessages,
  canSend,
}: {
  jobId: string;
  currentUserId: string;
  initialMessages: SentMessage[];
  canSend: boolean;
}) {
  const [messages, setMessages] = useState<SentMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function append(msg: SentMessage) {
    setMessages((prev) =>
      prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
    );
  }

  const postgresChanges = useMemo(
    () => ({
      event: "INSERT" as const,
      schema: "public",
      table: "messages",
      filter: `job_id=eq.${jobId}`,
    }),
    [jobId],
  );

  useRealtimeChannel<MessageRow>({
    channelName: `chat-${jobId}`,
    postgresChanges,
    onChange: (payload) => {
      const row = payload.new as MessageRow;
      append({
        id: row.id,
        senderId: row.sender_id,
        body: row.body,
        createdAt: row.created_at,
      });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await sendMessage({ jobId, body });
    setSending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDraft("");
    append(res.message);
  }

  return (
    <section className="rounded-md border border-border bg-card">
      <p className="border-b border-border px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
        Chat
      </p>

      <div className="flex max-h-72 min-h-32 flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="my-auto text-center text-sm text-muted-foreground">
            Todavía no hay mensajes. ¡Coordiná los detalles por acá!
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={cn(
                  "max-w-[80%] rounded-md px-3.5 py-2 text-sm",
                  mine
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-secondary text-secondary-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={cn(
                    "mt-0.5 text-right text-[10px]",
                    mine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {TIME.format(new Date(m.createdAt))}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <form
          onSubmit={submit}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribí un mensaje…"
            maxLength={2000}
            aria-label="Mensaje"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || draft.trim().length === 0}
            aria-label="Enviar"
          >
            {sending ? (
              <svg
                className="size-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="22" x2="11" y1="2" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </Button>
        </form>
      ) : (
        <p className="border-t border-border p-3 text-center text-xs text-muted-foreground">
          El chat quedó en solo lectura.
        </p>
      )}
    </section>
  );
}
