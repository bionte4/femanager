import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyWallet, getMyResidualWithdrawal } from "@/app/actions/wallet";
import { isPkwtEngagement } from "@/lib/eligibility";
import { EngineerWalletClient } from "@/components/engineer/wallet-client";
import { ResidualPayoutForm } from "@/components/engineer/residual-payout-form";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function EngineerWalletPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "FIELD_ENGINEER") {
    redirect("/login");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { engagement_type: true },
  });

  if (me && isPkwtEngagement(me.engagement_type)) {
    const [wallet, pendingResidual] = await Promise.all([
      prisma.engineerWallet.findUnique({
        where: { engineer_id: session.user.id },
        select: { balance: true },
      }),
      getMyResidualWithdrawal(),
    ]);
    const balance = wallet?.balance ?? 0;

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">
            Akun PKWT tidak memakai komisi mitra.
          </p>
        </div>
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pembayaran kamu lewat{" "}
            <span className="font-medium text-foreground">payroll HR</span>,
            bukan wallet ticket. Fitur tarik komisi hanya untuk Mitra.
          </p>
          {balance > 0 && (
            <p className="text-sm">
              Sisa saldo dari masa Mitra:{" "}
              <span className="font-semibold">{formatRupiah(balance)}</span>
            </p>
          )}
          {pendingResidual ? (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <Badge variant="warning" className="mb-1">
                {pendingResidual.status}
              </Badge>
              <p>
                Permintaan pencairan residual{" "}
                {formatRupiah(pendingResidual.amount)} sedang diproses admin.
              </p>
            </div>
          ) : (
            balance > 0 && <ResidualPayoutForm balance={balance} />
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/engineer/my-tickets">Kembali ke ticket</Link>
          </Button>
        </div>
      </div>
    );
  }

  const wallet = await getMyWallet();
  const { pkwt_restricted: _, ...clientWallet } = wallet;
  void _;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet Saya</h1>
        <p className="text-muted-foreground">Komisi ticket & penarikan saldo</p>
      </div>
      <EngineerWalletClient {...clientWallet} />
    </div>
  );
}
