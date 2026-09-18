import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { listExpiringContractsAction } from "@/app/actions/contracts";
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

export default async function HrContractsInboxPage() {
  const session = await auth();
  if (
    !session?.user ||
    !(ADMIN_ROLES as readonly string[]).includes(session.user.role)
  ) {
    redirect("/login");
  }

  const rows = await listExpiringContractsAction(30);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Kontrak hampir expired
        </h1>
        <p className="text-sm text-muted-foreground">
          Kontrak ACTIVE yang berakhir dalam 30 hari. Cron expire:{" "}
          <code className="text-xs">/api/cron/expire-contracts</code>
        </p>
      </div>

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
    </div>
  );
}
