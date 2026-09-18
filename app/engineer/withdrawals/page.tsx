import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getMyWithdrawals } from "@/app/actions/wallet";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function EngineerWithdrawalsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FIELD_ENGINEER) {
    redirect("/login");
  }

  const items = await getMyWithdrawals();

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
          <Link href="/engineer/wallet">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">History Penarikan</h1>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Belum ada penarikan" description="Ajukan dari halaman Wallet." />
      ) : (
        <ul className="space-y-3">
          {items.map((w) => (
            <li key={w.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xl font-bold">{formatRupiah(w.amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {w.bank_name} · {w.bank_account_no}
                  </p>
                  <p className="text-sm">{w.bank_account_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(w.requested_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <WdBadge status={w.status} />
              </div>
              {w.notes && (
                <p className="mt-2 text-sm text-muted-foreground">{w.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WdBadge({ status }: { status: string }) {
  const map: Record<string, "warning" | "default" | "success" | "destructive"> = {
    PENDING: "warning",
    APPROVED: "default",
    PAID: "success",
    REJECTED: "destructive",
  };
  return <Badge variant={map[status] ?? "secondary"}>{status}</Badge>;
}
