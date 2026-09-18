"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Store,
  Cpu,
  HardHat,
  Ticket,
  BarChart3,
  Settings,
  Package,
  Plug,
  Wallet,
  ShieldAlert,
  Trophy,
  UserPlus,
  BookOpen,
  Layers,
  Scale,
  GitBranch,
  Radio,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/admin/notification-bell";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operasi",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/war-room", label: "War Room", icon: Radio },
      { href: "/admin/map", label: "Peta", icon: Map },
      { href: "/admin/routing", label: "Routing", icon: GitBranch },
      { href: "/admin/tickets", label: "Tickets", icon: Ticket },
      { href: "/admin/fraud-center", label: "Fraud", icon: ShieldAlert },
    ],
  },
  {
    label: "Master",
    items: [
      { href: "/admin/tenants", label: "Tenants", icon: Store },
      { href: "/admin/devices", label: "Devices", icon: Cpu },
      { href: "/admin/service-categories", label: "Kategori", icon: Layers },
      { href: "/admin/spareparts", label: "Spareparts", icon: Package },
      { href: "/admin/kb", label: "Knowledge Base", icon: BookOpen },
    ],
  },
  {
    label: "Mitra",
    items: [
      { href: "/admin/engineers", label: "Engineers", icon: HardHat },
      { href: "/admin/recruitment", label: "Recruitment", icon: UserPlus },
      { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/admin/legal", label: "Legal", icon: Scale },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { href: "/admin/payroll", label: "Payroll", icon: Wallet },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/admin/integrations", label: "Integrations", icon: Plug },
      { href: "/admin/integrations/dlq", label: "Webhook DLQ", icon: Plug },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

function isActivePath(pathname: string, href: string): boolean {
  if (!pathname.startsWith(href)) return false;
  // Hindari false positive: pilih match terpanjang
  const longer = ALL_HREFS.some(
    (other) =>
      other !== href &&
      other.startsWith(href) &&
      pathname.startsWith(other)
  );
  return !longer;
}

type AdminSidebarProps = {
  userName: string;
  userRole: string;
};

export function AdminSidebar({ userName, userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = userRole.replaceAll("_", " ");

  const nav = (
    <nav className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-2">
      <div className="space-y-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-none transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-primary"
                            : "text-sidebar-foreground/45"
                        )}
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar — compact */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
            FE
          </div>
          <span className="text-sm font-semibold tracking-tight">FE-Track</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-12 shrink-0 items-center gap-2 px-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
            FE
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-none tracking-tight">
              FE-Track
            </p>
            <p className="mt-0.5 truncate text-[10px] text-sidebar-foreground/45">
              NOC Console
            </p>
          </div>
        </div>

        <div className="mx-2.5 h-px bg-sidebar-border" />

        {nav}

        <div className="shrink-0 border-t border-sidebar-border p-2.5">
          <div className="mb-2 flex items-center gap-2 px-0.5">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-sidebar-accent text-[10px] text-sidebar-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium leading-tight">
                {userName}
              </p>
              <p className="truncate text-[10px] capitalize text-sidebar-foreground/45">
                {roleLabel.toLowerCase()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-2 px-2.5 text-[12px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </Button>
        </div>
      </aside>
    </>
  );
}
