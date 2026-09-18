import { z } from "zod";

export const REMOTE_ACTION_OPTIONS = [
  "PING_CHECK",
  "REMOTE_REBOOT",
  "PORT_CHECK",
  "VPN_CHECK",
  "VENDOR_PORTAL",
  "POWER_CYCLE_GUIDE",
  "NONE_ACCESSIBLE",
] as const;

export type RemoteAction = (typeof REMOTE_ACTION_OPTIONS)[number];

export const REMOTE_ACTION_LABELS: Record<RemoteAction, string> = {
  PING_CHECK: "Ping / ICMP check",
  REMOTE_REBOOT: "Remote reboot dicoba",
  PORT_CHECK: "Cek port / service",
  VPN_CHECK: "Cek VPN / tunnel",
  VENDOR_PORTAL: "Cek portal vendor",
  POWER_CYCLE_GUIDE: "Guide PIC power-cycle",
  NONE_ACCESSIBLE: "Tidak bisa remote (akses terbatas)",
};

export const l1HandoverSchema = z.object({
  symptoms: z
    .string()
    .trim()
    .min(10, "Gejala minimal 10 karakter")
    .max(1000),
  last_ping: z
    .string()
    .trim()
    .min(3, "Status last ping wajib diisi")
    .max(200),
  remote_actions: z
    .array(z.enum(REMOTE_ACTION_OPTIONS))
    .min(1, "Pilih minimal 1 aksi remote yang sudah dicoba"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type L1HandoverInput = z.infer<typeof l1HandoverSchema>;

export type L1HandoverPayload = {
  symptoms: string;
  last_ping: string;
  remote_actions: string[];
  notes: string | null;
  handed_over_at: string;
  handed_over_by: string;
};

export function formatHandoverLog(h: L1HandoverInput): string {
  const actions = h.remote_actions
    .map((a) => REMOTE_ACTION_LABELS[a] ?? a)
    .join("; ");
  const notes = h.notes?.trim() ? ` | Notes: ${h.notes.trim()}` : "";
  return `HANDOVER L0→L1 | Gejala: ${h.symptoms.trim()} | Last ping: ${h.last_ping.trim()} | Remote: ${actions}${notes}`;
}
