import type { DeviceType } from "@prisma/client";

export type ChecklistItem = {
  id: string;
  label: string;
};

/** Checklist dinamis PM/CM sesuai tipe device */
export function getDeviceChecklist(type: DeviceType | null | undefined): ChecklistItem[] {
  const common: ChecklistItem[] = [
    { id: "power", label: "Cek power / adaptor" },
    { id: "cable", label: "Cek kabel & konektor" },
    { id: "reboot", label: "Restart perangkat" },
  ];

  if (!type) {
    return [
      ...common,
      { id: "test", label: "Test fungsi perangkat" },
      { id: "foto", label: "Dokumentasi kondisi" },
    ];
  }

  if (type === "EDC_BCA" || type === "EDC_BRI") {
    return [
      ...common,
      { id: "sim", label: "Cek SIM card / signal" },
      { id: "paper", label: "Cek kertas thermal" },
      { id: "settle", label: "Test transaksi / settlement" },
      { id: "print", label: "Test print struk" },
    ];
  }

  if (type === "ROUTER") {
    return [
      ...common,
      { id: "wan", label: "Cek WAN / internet link" },
      { id: "ping", label: "Ping gateway & DNS" },
      { id: "wifi", label: "Cek WiFi SSID & password" },
      { id: "config", label: "Backup / verifikasi config" },
    ];
  }

  // SWITCH
  return [
    ...common,
    { id: "port", label: "Cek port link LED" },
    { id: "lan", label: "Test LAN ke PC/EDC" },
    { id: "ping", label: "Ping antar perangkat" },
    { id: "vlan", label: "Cek VLAN / trunk (jika ada)" },
  ];
}
