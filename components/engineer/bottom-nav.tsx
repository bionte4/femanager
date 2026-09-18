"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ticket, History, Wallet, User, Trophy, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/engineer/my-tickets",
    label: "Ticket",
    icon: Ticket,
    match: ["/engineer/my-tickets", "/engineer/tickets"],
  },
  {
    href: "/engineer/history",
    label: "History",
    icon: History,
    match: ["/engineer/history"],
  },
  {
    href: "/engineer/leaderboard",
    label: "Rank",
    icon: Trophy,
    match: ["/engineer/leaderboard"],
  },
  {
    href: "/engineer/kb",
    label: "SOP",
    icon: BookOpen,
    match: ["/engineer/kb"],
  },
  {
    href: "/engineer/wallet",
    label: "Wallet",
    icon: Wallet,
    match: ["/engineer/wallet", "/engineer/withdrawals"],
  },
  {
    href: "/engineer/profile",
    label: "Profil",
    icon: User,
    match: ["/engineer/profile", "/engineer/agreement"],
  },
] as const;

export function EngineerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <ul className="mx-auto flex h-14 max-w-lg items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match.some((m) => pathname.startsWith(m));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "stroke-[2.5px]")}
                  aria-hidden
                />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
