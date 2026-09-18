"use server";

import { prisma } from "@/lib/prisma";
import { createTicketRecord } from "@/lib/tickets/service";

export async function submitPublicOrderAction(input: {
  service_category_id: string;
  service_package_id?: string | null;
  customer_name: string;
  customer_phone: string;
  address: string;
  city: string;
  description: string;
  photo_url?: string | null;
}): Promise<{ success: boolean; error?: string; ticket_no?: string }> {
  try {
    if (!input.customer_name.trim() || input.customer_phone.length < 10) {
      return { success: false, error: "Nama & WA wajib diisi" };
    }
    if (input.description.trim().length < 10) {
      return { success: false, error: "Deskripsi minimal 10 karakter" };
    }

    const category = await prisma.serviceCategory.findFirst({
      where: { id: input.service_category_id, is_active: true },
    });
    if (!category) return { success: false, error: "Kategori tidak valid" };

    // Tenant publik: satu tenant catch-all per kota, atau buat on-the-fly
    const code = `PUB-${input.city
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12) || "UMUM"}`;

    let tenant = await prisma.tenant.findFirst({
      where: { code },
    });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: `Public Order — ${input.city || "UMKM"}`,
          code,
          address: input.address,
          province: "—",
          city: input.city || "—",
          district: "—",
          lat: -6.2,
          lng: 106.8,
          pic_name: input.customer_name,
          pic_phone: input.customer_phone,
          sla_tier: "TIER2_PROVINCE",
          is_active: true,
        },
      });
    }

    const desc = [
      input.description.trim(),
      `Customer: ${input.customer_name} / WA ${input.customer_phone}`,
      `Alamat: ${input.address}, ${input.city}`,
      input.photo_url ? `Foto: ${input.photo_url}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const ticket = await createTicketRecord({
      tenant_id: tenant.id,
      service_category_id: input.service_category_id,
      service_package_id: input.service_package_id || null,
      description: desc,
      reported_by: input.customer_name,
      source: "PUBLIC_ORDER",
      type: "INCIDENT",
      priority: "MEDIUM",
    });

    return { success: true, ticket_no: ticket.ticket_no };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal submit order",
    };
  }
}
