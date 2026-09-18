"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  type: string;
  read_at: Date | string | null;
  created_at: Date | string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const data = await getMyNotifications(15);
      setItems(data.items as Notif[]);
      setUnread(data.unread);
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function onOpen() {
    setOpen((v) => !v);
    if (!open) refresh();
  }

  async function onClickItem(n: Notif) {
    if (!n.read_at) {
      await markNotificationRead(n.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
        )
      );
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
  }

  async function onMarkAll() {
    await markAllNotificationsRead();
    setItems((prev) =>
      prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() }))
    );
    setUnread(0);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-8 w-8"
        onClick={onOpen}
        aria-label="Notifikasi"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Tutup notifikasi"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-semibold">Notifikasi</p>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={onMarkAll}
                disabled={unread === 0}
              >
                Tandai dibaca
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {pending ? "Memuat…" : "Belum ada notifikasi"}
                </li>
              )}
              {items.map((n) => {
                const content = (
                  <div
                    className={cn(
                      "border-b px-3 py-2.5 transition-colors hover:bg-muted/60",
                      !n.read_at && "bg-primary/5"
                    )}
                  >
                    <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} onClick={() => onClickItem(n)}>
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => onClickItem(n)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
