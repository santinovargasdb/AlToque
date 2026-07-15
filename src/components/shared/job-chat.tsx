"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          append({
            id: row.id,
            senderId: row.sender_id,
            body: row.body,
            createdAt: row.created_at,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId]);

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
    <section className="rounded-xl border border-border bg-card">
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
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                  mine
                    ? "self-end rounded-br-md bg-primary text-primary-foreground"
                    : "self-start rounded-bl-md bg-secondary text-secondary-foreground",
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
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
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
