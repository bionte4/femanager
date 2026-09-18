import type { DeviceCategory, DeviceType, TicketType } from "@prisma/client";

export type ChecklistFieldType = "checkbox" | "text" | "number" | "photo";

export type ChecklistItemDef = {
  id: string;
  label: string;
  field: ChecklistFieldType;
  required: boolean;
  /** Placeholder untuk input text/number */
  placeholder?: string;
};

/** Checklist dinamis per kategori device / jenis pekerjaan */
export const CHECKLISTS = {
  EDC: [
    { id: "power", label: "Cek kabel power", field: "checkbox", required: true },
    { id: "paper", label: "Cek kertas thermal", field: "checkbox", required: true },
    { id: "trx", label: "Test transaksi", field: "checkbox", required: true },
    { id: "foto_sn", label: "Foto SN EDC", field: "photo", required: true },
    { id: "foto_struk", label: "Foto struk test", field: "photo", required: true },
  ],
  SDWAN_INSTALL: [
    { id: "foto_sn", label: "Foto SN Router SDWAN & dus", field: "photo", required: true },
    { id: "foto_rack", label: "Foto rack sebelum & sesudah", field: "photo", required: true },
    {
      id: "link1_ip",
      label: "Cek Link 1 ISP — IP",
      field: "text",
      required: true,
      placeholder: "IP Link1",
    },
    {
      id: "link1_latency",
      label: "Cek Link 1 ISP — latency (ms)",
      field: "number",
      required: true,
      placeholder: "ms",
    },
    {
      id: "link2_ip",
      label: "Cek Link 2 ISP — IP",
      field: "text",
      required: true,
      placeholder: "IP Link2",
    },
    {
      id: "link2_latency",
      label: "Cek Link 2 ISP — latency (ms)",
      field: "number",
      required: true,
      placeholder: "ms",
    },
    {
      id: "foto_tunnel",
      label: "Foto tunnel status di dashboard (hijau)",
      field: "photo",
      required: true,
    },
    { id: "ping_l1", label: "Test ping 8.8.8.8 via Link1", field: "checkbox", required: true },
    { id: "ping_l2", label: "Test ping 8.8.8.8 via Link2", field: "checkbox", required: true },
    {
      id: "failover",
      label: "Test failover cabut Link1 (harus tetap online)",
      field: "checkbox",
      required: true,
    },
    {
      id: "foto_speedtest",
      label: "Speedtest Link1 & Link2 (screenshot)",
      field: "photo",
      required: true,
    },
    { id: "foto_tunnel_id", label: "Foto QR / Tunnel ID", field: "photo", required: true },
  ],
  SDWAN_TROUBLESHOOT: [
    { id: "led", label: "Cek lampu indikator router", field: "checkbox", required: true },
    { id: "log", label: "Cek log tunnel down", field: "checkbox", required: true },
    {
      id: "foto_error",
      label: "Foto error di dashboard SDWAN",
      field: "photo",
      required: true,
    },
    { id: "ping_ctrl", label: "Test ping ke controller", field: "checkbox", required: true },
    {
      id: "foto_reboot",
      label: "Restart router (foto sebelum/sesudah)",
      field: "photo",
      required: true,
    },
    { id: "cable", label: "Cek kabel LAN/WAN", field: "checkbox", required: true },
  ],
} as const satisfies Record<string, ChecklistItemDef[]>;

export type ChecklistKey = keyof typeof CHECKLISTS;

export type ChecklistAnswers = Record<
  string,
  { checked?: boolean; value?: string; photo_url?: string }
>;

export function isSdwanDevice(
  category: DeviceCategory | null | undefined,
  type?: DeviceType | null
): boolean {
  if (category === "ROUTER_SDWAN") return true;
  if (type === "ROUTER_SDWAN") return true;
  return false;
}

export function resolveChecklistKey(params: {
  device_category?: DeviceCategory | null;
  device_type?: DeviceType | null;
  ticket_type?: TicketType | null;
  description?: string | null;
}): ChecklistKey {
  const sdwan = isSdwanDevice(params.device_category, params.device_type);
  if (sdwan) {
    const desc = (params.description ?? "").toLowerCase();
    if (
      params.ticket_type === "PM" ||
      params.ticket_type === "CM" ||
      desc.includes("install") ||
      desc.includes("pasang") ||
      desc.includes("migrasi")
    ) {
      return "SDWAN_INSTALL";
    }
    return "SDWAN_TROUBLESHOOT";
  }
  return "EDC";
}

export function getChecklistItems(key: ChecklistKey): ChecklistItemDef[] {
  return [...CHECKLISTS[key]];
}

/** Validasi semua item required sudah terisi */
export function isChecklistComplete(
  key: ChecklistKey,
  answers: ChecklistAnswers | null | undefined
): { ok: boolean; missing: string[] } {
  const items = CHECKLISTS[key];
  const missing: string[] = [];
  const a = answers ?? {};

  for (const item of items) {
    if (!item.required) continue;
    const ans = a[item.id];
    if (!ans) {
      missing.push(item.label);
      continue;
    }
    if (item.field === "checkbox" && !ans.checked) missing.push(item.label);
    if (item.field === "photo" && !ans.photo_url) missing.push(item.label);
    if (
      (item.field === "text" || item.field === "number") &&
      (!ans.value || String(ans.value).trim() === "")
    ) {
      missing.push(item.label);
    }
  }

  return { ok: missing.length === 0, missing };
}

export function checklistHasPhoto(
  answers: ChecklistAnswers | null | undefined,
  itemId: string
): boolean {
  return !!answers?.[itemId]?.photo_url;
}
