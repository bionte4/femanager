import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicOrderForm } from "@/components/order/public-order-form";

export const metadata: Metadata = {
  title: "Order Jasa Teknisi | FE-Track",
  description:
    "Order servis laptop, pasang CCTV, benerin WiFi, EDC — tanpa login.",
};

export default async function PublicOrderPage() {
  const categories = await prisma.serviceCategory.findMany({
    where: { is_active: true },
    select: {
      id: true,
      code: true,
      name: true,
      icon: true,
      packages: {
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          description: true,
          price_customer: true,
          fee_engineer: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← FE-Track
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Order Teknisi
        </h1>
        <p className="mt-1 text-muted-foreground">
          Servis Laptop, Pasang CCTV, Benerin WiFi, EDC — isi form, kami
          dispatch FE terdekat.
        </p>
        <div className="mt-6">
          <PublicOrderForm categories={categories} />
        </div>
      </div>
    </div>
  );
}
