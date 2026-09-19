"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAppAdmin } from "@/lib/rbac";
import { slaConfigSchema, type SlaConfigInput } from "@/lib/validations/master";

async function requireAdmin() {
  return requireAppAdmin();
}

type ActionResult = { success: true } | { success: false; error: string };

export async function getSlaConfigs() {
  await requireAdmin();
  return prisma.slaConfig.findMany({
    orderBy: { tier_name: "asc" },
  });
}

export async function updateSlaConfig(input: SlaConfigInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = slaConfigSchema.parse(input);

    if (data.resolution_time_minutes < data.response_time_minutes) {
      return {
        success: false,
        error: "Resolution time harus >= response time",
      };
    }

    await prisma.slaConfig.update({
      where: { id: data.id },
      data: {
        response_time_minutes: data.response_time_minutes,
        resolution_time_minutes: data.resolution_time_minutes,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal update SLA" };
  }
}
