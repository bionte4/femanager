"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle, Send, X } from "lucide-react";
import {
  askKnowledgeBaseAction,
  getTicketKbCategoryAction,
  type KbChatResult,
} from "@/app/actions/kb-chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: "user" | "bot";
  text: string;
  hits?: KbChatResult["hits"];
  lowConfidence?: boolean;
};

const SUGGESTIONS = [
  "EDC line idle / tidak transaksi",
  "Tunnel SDWAN down",
  "Cara test failover",
  "Kabel UTP / LAN toko",
  "WiFi lemah putus-putus",
];

type KbChatWidgetProps = {
  /** Mode admin: uji di halaman KB */
  audience?: "engineer" | "admin";
  /** Kategori awal (opsional) */
  category?: string | null;
  /** Embedded di panel (bukan floating) */
  embedded?: boolean;
  className?: string;
};

export function KbChatWidget({
  audience = "engineer",
  category: categoryProp = null,
  embedded = false,
  className,
}: KbChatWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(embedded);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState<string | null>(categoryProp);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "bot",
      text:
        "Tanya SOP dari Knowledge Base. Contoh: “tunnel down”, “printer thermal”, “failover”. Jawaban dari artikel internal — bukan AI bebas.",
    },
  ]);
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync prop category
  useEffect(() => {
    if (categoryProp) setCategory(categoryProp);
  }, [categoryProp]);

  // Di detail ticket engineer → ambil kategori device
  useEffect(() => {
    if (audience !== "engineer") return;
    const m = pathname?.match(/\/engineer\/tickets\/([^/]+)/);
    if (!m?.[1]) return;
    let cancelled = false;
    void getTicketKbCategoryAction(m[1]).then((r) => {
      if (!cancelled && r.category) setCategory(r.category);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, audience]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;

    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);

    void (async () => {
      try {
        const res = await askKnowledgeBaseAction({
          question: q,
          category,
          audience,
        });

        if (!res.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              role: "bot",
              text: res.error,
              lowConfidence: true,
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: "bot",
            text: res.answer,
            hits: res.hits,
            lowConfidence: res.lowConfidence,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: "bot",
            text: "Gagal menghubungi server. Coba lagi.",
            lowConfidence: true,
          },
        ]);
      } finally {
        setPending(false);
      }
    })();
  }

  const panel = (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card shadow-lg",
        embedded ? "h-[420px] w-full" : "h-[min(70vh,480px)] w-[min(100vw-1.5rem,360px)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold leading-snug">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            Tanya SOP
          </p>
          <p className="truncate text-[10px] leading-snug text-muted-foreground">
            {category
              ? `Konteks: ${category} · sumber Knowledge Base`
              : "Sumber Knowledge Base (search lokal)"}
          </p>
        </div>
        {!embedded && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[95%] rounded-lg px-2.5 py-1.5 text-[12px] leading-snug",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted/80 text-foreground"
            )}
          >
            <p className="whitespace-pre-wrap">{m.text.replace(/\*\*(.+?)\*\*/g, "$1")}</p>
            {m.hits && m.hits.length > 0 && (
              <ul className="mt-1.5 space-y-1 border-t border-border/60 pt-1.5">
                {m.hits.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={h.href}
                      className="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
                      onClick={() => !embedded && setOpen(false)}
                    >
                      [{h.category}] {h.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {m.lowConfidence && m.role === "bot" && (
              <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">
                Confidence rendah — verifikasi di lapangan / escalate.
              </p>
            )}
          </div>
        ))}
        {pending && (
          <p className="text-[11px] text-muted-foreground">Mencari SOP…</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 space-y-1.5 border-t px-2.5 py-2">
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => ask(s)}
              className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium leading-snug text-muted-foreground hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya SOP…"
            className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
          />
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={pending || !input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );

  if (embedded) return panel;

  return (
    <div className="pointer-events-none fixed bottom-[4.5rem] right-3 z-40 flex flex-col items-end gap-2 sm:bottom-6">
      {open && <div className="pointer-events-auto">{panel}</div>}
      <Button
        type="button"
        size="icon"
        className="pointer-events-auto h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup chat SOP" : "Buka chat SOP"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}
