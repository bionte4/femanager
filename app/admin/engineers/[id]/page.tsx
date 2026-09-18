import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, ADMIN_ROLES, CONTRACT_ADMIN_ROLES } from "@/lib/auth";
import { getEngineerPerformance } from "@/lib/engineer-stats";
import { formatMttr } from "@/lib/sla";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TicketStatusBadge } from "@/components/ticket/status-badge";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EngineerDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const canManageContracts = (CONTRACT_ADMIN_ROLES as readonly string[]).includes(
    session.user.role
  );

  const { id } = await Promise.resolve(params);
  const data = await getEngineerPerformance(id);
  if (!data) notFound();

  const { engineer, stats, recent_tickets, photos } = data;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/admin/engineers">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{engineer.full_name}</h1>
          <p className="text-xs text-muted-foreground">
            {engineer.phone} · {engineer.city ?? "—"}
            {engineer.district ? `, ${engineer.district}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={engineer.status === "AVAILABLE" ? "success" : "secondary"}>
              {engineer.status}
            </Badge>
            <Badge variant="outline">Rating {engineer.rating.toFixed(1)}</Badge>
            <Badge variant="outline">
              {engineer.engagement_type === "MITRA"
                ? "Mitra"
                : engineer.engagement_type === "PKWT_OUTTASK"
                  ? "PKWT Outtask"
                  : engineer.engagement_type === "PKWT_INTERNAL"
                    ? "PKWT Internal"
                    : engineer.engagement_type}
            </Badge>
            <Badge
              variant={
                engineer.partnership_status === "SIGNED" ? "success" : "warning"
              }
            >
              Kemitraan{" "}
              {engineer.partnership_status === "SIGNED"
                ? "Signed"
                : "Belum Signed"}
            </Badge>
            {engineer.can_work_for_others && (
              <Badge variant="outline">Boleh kerja di tempat lain</Badge>
            )}
            {engineer.skills.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
            {data.specialist_badges.map((b) => (
              <Badge key={b.code} variant="success">
                {b.label} ({b.count})
              </Badge>
            ))}
          </div>
          {engineer.tools_owned.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Tools owned: {engineer.tools_owned.join(", ")}
            </p>
          )}
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href={`/admin/engineers/${engineer.id}/certifications`}>
              Kelola Sertifikasi SDWAN
            </Link>
          </Button>
          {canManageContracts && (
            <Button asChild size="sm" variant="outline" className="mt-3 ml-2">
              <Link href={`/admin/engineers/${engineer.id}/contracts`}>
                Kelola Kontrak PKWT
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total ticket" value={String(stats.total_tickets)} />
        <StatCard title="Closed" value={String(stats.closed_tickets)} hint={`${stats.active_tickets} aktif`} />
        <StatCard title="MTTR" value={formatMttr(stats.mttr_minutes)} />
        <StatCard title="SLA meet rate" value={`${stats.sla_meet_rate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>History ticket</CardTitle>
            <CardDescription>15 ticket terakhir yang di-assign</CardDescription>
          </CardHeader>
          <CardContent>
            {recent_tickets.length === 0 ? (
              <EmptyState title="Belum ada ticket" description="Engineer ini belum pernah di-assign." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent_tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/admin/tickets/${t.id}`}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {t.ticket_no}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[140px] truncate">{t.tenant_name}</p>
                        <p className="text-xs text-muted-foreground">{t.tenant_city}</p>
                      </TableCell>
                      <TableCell>
                        <TicketStatusBadge status={t.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Foto pekerjaan</CardTitle>
            <CardDescription>Before/After dari ticket log</CardDescription>
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <EmptyState
                title="Belum ada foto"
                description="Foto akan muncul setelah engineer upload di lapangan."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p, idx) => (
                  <a
                    key={`${p.url}-${idx}`}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-lg border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.ticket_no}
                      className="aspect-square w-full object-cover transition group-hover:scale-105"
                    />
                    <p className="truncate px-2 py-1 text-xs text-muted-foreground">
                      {p.ticket_no}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
