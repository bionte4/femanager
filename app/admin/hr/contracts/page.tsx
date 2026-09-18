import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, CONTRACT_ADMIN_ROLES } from "@/lib/auth";
import {
  listExpiringContractsAction,
  listRecentEngagementChanges,
} from "@/app/actions/contracts";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HrContractsInboxPage() {
  const session = await auth();
  if (
    !session?.user ||
    !(CONTRACT_ADMIN_ROLES as readonly string[]).includes(session.user.role)
  ) {
    redirect("/admin/dashboard");
  }

  const [rows, changeLogs] = await Promise.all([
    listExpiringContractsAction(30),
    listRecentEngagementChanges(40),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Kontrak & engagement HR
        </h1>
        <p className="text-sm text-muted-foreground">
          Inbox expire 30 hari · Cron:{" "}
          <code className="text-xs">/api/cron/expire-contracts</code>,{" "}
          <code className="text-xs">/api/cron/remind-contracts</code> (WA
          hari 30/14/7/3)
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Kontrak hampir expired</h2>
        {rows.length === 0 ? (
          <EmptyState
            title="Tidak ada kontrak hampir expired"
            description="Semua kontrak ACTIVE masih lebih dari 30 hari, atau belum ada data."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Engineer</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Berakhir</TableHead>
                <TableHead>Sisa hari</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const days = Math.ceil(
                  (new Date(c.end_at).getTime() - Date.now()) /
                    (24 * 60 * 60 * 1000)
                );
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/engineers/${c.user.id}/contracts`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {c.user.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.user.phone}
                        {c.user.city ? ` · ${c.user.city}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">{c.type}</TableCell>
                    <TableCell className="text-xs">
                      {c.client_label ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(c.end_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          days <= 7
                            ? "destructive"
                            : days <= 14
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {days} hari
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Audit ganti engagement (terbaru)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {changeLogs.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat flip"
              description="Perubahan MITRA ↔ PKWT akan muncul di sini."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Engineer</TableHead>
                  <TableHead>Perubahan</TableHead>
                  <TableHead>Oleh</TableHead>
                  <TableHead>Alasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(l.created_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/engineers/${l.user_id}/contracts`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {l.engineer_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {l.engineer_phone}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {l.from_type} → {l.to_type}
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.changed_by_name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                      {l.reason ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
