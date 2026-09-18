import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getMyWallet } from "@/app/actions/wallet";
import { EngineerWalletClient } from "@/components/engineer/wallet-client";

export default async function EngineerWalletPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FIELD_ENGINEER) {
    redirect("/login");
  }

  const wallet = await getMyWallet();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet Saya</h1>
        <p className="text-muted-foreground">Komisi ticket & penarikan saldo</p>
      </div>
      <EngineerWalletClient {...wallet} />
    </div>
  );
}
