"use client";

import { Store, AlertTriangle, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type Kpi = {
  total_tenant: number;
  total_down: number;
  ticket_overdue: number;
  sla_percent_today: number;
};

export function MapKpiCards({ kpi }: { kpi: Kpi }) {
  const cards = [
    {
      label: "Total Tenant",
      value: kpi.total_tenant,
      icon: Store,
      className: "border-emerald-200/60 bg-emerald-50/90 text-emerald-900",
      iconClass: "text-emerald-700",
    },
    {
      label: "Total Down",
      value: kpi.total_down,
      icon: AlertTriangle,
      className: "border-red-200/60 bg-red-50/90 text-red-900",
      iconClass: "text-red-700",
    },
    {
      label: "Ticket Overdue",
      value: kpi.ticket_overdue,
      icon: Clock,
      className: "border-amber-200/60 bg-amber-50/90 text-amber-950",
      iconClass: "text-amber-700",
    },
    {
      label: "SLA % Hari Ini",
      value: `${kpi.sla_percent_today}%`,
      icon: Target,
      className: "border-sky-200/60 bg-sky-50/90 text-sky-950",
      iconClass: "text-sky-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm backdrop-blur",
            c.className
          )}
        >
          <c.icon className={cn("h-5 w-5 shrink-0", c.iconClass)} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium opacity-70">{c.label}</p>
            <p className="text-lg font-bold leading-tight tabular-nums">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
