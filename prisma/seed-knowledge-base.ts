/**
 * Seed Knowledge Base — SOP lapangan umum & terpercaya.
 * Sumber praktik: standar field service EDC (Ingenico/Verifone/PAX),
 * troubleshooting jaringan (ping/DHCP/cabling), SOP SDWAN install/failover,
 * dan prosedur safety/dokumentasi FE-Track.
 *
 * Catatan: konten generik operasional (bukan salinan buku saku bank).
 * Link eksternal hanya ke dokumen publik vendor jika tersedia.
 */

export type KbSeedItem = {
  title: string;
  category: string;
  content: string;
  video_url?: string | null;
  file_url?: string | null;
};

export const KNOWLEDGE_BASE_SEED: KbSeedItem[] = [
  // ─── EDC ───────────────────────────────────────────────
  {
    title: "SOP Kunjungan EDC — Check-in & Dokumentasi",
    category: "EDC",
    content: `# SOP Kunjungan EDC

## Persiapan
1. Baca deskripsi ticket + TID/MID (jika ada) + gejala merchant.
2. Bawa: EDC cadangan (jika stock), adaptor original, kertas thermal, cable LAN (jika IP), SIM cadangan **hanya jika diinstruksikan NOC**.
3. Konfirmasi PIC merchant & jam operasional toko.

## Di lokasi
1. **Check-in GPS** dalam radius 100m dari toko (wajib).
2. Foto **Before**: posisi EDC, kabel power/LAN/SIM, layar error (jika ada).
3. Catat SN di badan terminal + TID jika tercetak di struk/config.
4. Jangan ganti SIM / inject key / ubah TID tanpa instruksi Helpdesk/NOC.

## Closing
1. Foto **After**: layar standby/menu, hasil test transaksi (jika diizinkan).
2. Edukasi singkat merchant (kertas, charging, jangan cabut sembarangan).
3. Update status ticket + notes jelas (gejala → aksi → hasil).
`,
    file_url:
      "https://ingenico.com/sites/default/files/resource-document/2022-11/UOB%20Guide%20%28DK5000MOVE5000%29.pdf",
  },
  {
    title: "Troubleshoot EDC — Tidak Bisa Transaksi / Line IDLE",
    category: "EDC",
    content: `# EDC Tidak Bisa Transaksi

Gejala umum: *Waiting for Line*, *Line IDLE*, *Host Not Available*, transaksi gagal berulang.

## Checklist cepat (urut)
1. **Power** — adaptor original, colokan hidup, baterai ≥20% (portable).
2. **Koneksi**
   - GPRS/4G: cek sinyal, SIM terpasang benar, jangan tukar SIM sembarangan.
   - LAN/IP: kabel LAN klik, link LED nyala, coba port lain / cable tester.
   - Wi-Fi (jika model support): pastikan SSID/password benar, signal kuat.
3. **Restart** sesuai prosedur model (Function → Enter / power cycle 10 detik).
4. **Print Config / Check Connection** (menu Help/Function) — foto hasilnya.
5. **Kertas thermal** — habis/salah arah sering dianggap "rusak printer".
6. Jika tetap gagal: catat error code + TID + SN → escalate NOC / minta replace unit.

## Larangan
- Jangan factory reset tanpa approval.
- Jangan ganti parameter host/TID sendiri.
`,
  },
  {
    title: "Troubleshoot EDC — Printer / Struk / Kertas Thermal",
    category: "EDC",
    content: `# Printer EDC & Kertas Thermal

## Gejala
- Tidak keluar struk / struk blank / kertas macet / printer error.

## Langkah
1. Buka cover printer — pastikan kertas thermal **thermal side** menghadap benar (uji gores kuku: sisi hitam = thermal).
2. Gulung kertas rata, tutup cover sampai klik.
3. Reprint last receipt (jika menu ada).
4. Bersihkan print head dengan kain lembut kering (jangan cairan sembarangan).
5. Jika mechanik macet / suara abnormal → replace unit, jangan bongkar dalam.

## Dokumentasi
Foto posisi kertas + hasil reprint + SN.
`,
  },
  {
    title: "SOP Replace Unit EDC",
    category: "EDC",
    content: `# Penggantian Unit EDC

## Syarat
- Ticket escalate / instruksi NOC: replace.
- Unit baru dari stock gudang/engineer (SKU tercatat).

## Prosedur
1. Foto SN unit lama + kondisi fisik.
2. Cabut power & kabel dengan aman; serahkan unit lama ke PIC (atau bawa balik sesuai policy).
3. Pasang unit baru — power, LAN/SIM sesuai tipe.
4. Minta NOC / Helpdesk **aktivasi / inject / mapping TID** jika diperlukan.
5. Test transaksi kecil (atau sale void sesuai kebijakan bank) + foto struk sukses.
6. Update mutasi sparepart di app (OUT tied ke ticket).
7. Catat SN lama → SN baru di notes ticket.
`,
  },
  {
    title: "PM EDC — Preventive Maintenance Merchant",
    category: "EDC",
    content: `# Preventive Maintenance EDC

## Checklist PM
1. Bersihkan badan terminal & card reader (kering).
2. Cek adaptor & kabel — tidak putus/panas berlebih.
3. Cek stok kertas thermal di merchant.
4. Print config / cek koneksi.
5. Test transaksi (jika diizinkan PIC).
6. Edukasi: charging, jangan taruh di tempat panas/basah, laporkan error segera.

## Output
Foto before/after + checklist di notes. Status RESOLVED hanya jika semua item OK.
`,
  },

  // ─── SDWAN ─────────────────────────────────────────────
  {
    title: "Cara Install Router SDWAN Telkom",
    category: "SDWAN",
    content: `# Install Router SDWAN

## Persiapan
- Router + dus + SN photo.
- 2 link ISP (Link1 & Link2) siap di patch panel / ONT.
- IP/credential sesuai work order (jangan tebak).

## Langkah
1. Foto rack **before**.
2. Mount router di rack; grounding jika tersedia.
3. Hubungkan Link1 & Link2 ke port WAN sesuai label.
4. Hubungkan LAN ke switch/LAN toko sesuai diagram.
5. Power on — tunggu boot selesai.
6. Login dashboard controller / local — pastikan **tunnel hijau**.
7. Catat Tunnel ID di checklist ticket.
8. Ping gateway + host internal bank (jika ada daftar).
9. Foto **after**: LED, dashboard tunnel, SN, label port.

## Closing
Isi checklist SDWAN_INSTALL lengkap + speedtest.
`,
  },
  {
    title: "Troubleshoot Tunnel Down",
    category: "SDWAN",
    content: `# Troubleshoot Tunnel SDWAN Down

## Urutan diagnosa
1. LED WAN/LAN — link physical UP?
2. Cek kabel & SFP/ONT masing-masing ISP.
3. Ping ke gateway ISP Link1 & Link2.
4. Cek dashboard: status tunnel, last disconnect reason, CPU/memory.
5. Cek jam/NTP device (skew waktu sering bikin auth tunnel gagal).
6. Soft reboot router **setelah izin NOC** jika config terlihat OK.
7. Jika 1 link mati: pastikan traffic failover ke link surviving.

## Escalate
Kirim: Tunnel ID, screenshot dashboard, traceroute, foto LED, hasil ping.
`,
  },
  {
    title: "Cara Test Failover",
    category: "SDWAN",
    content: `# Test Failover Dual Link

1. Pastikan Link1 & Link2 **UP**, tunnel hijau.
2. Jalankan ping continuous ke host kritis (atau speedtest baseline).
3. Cabut **Link1** — traffic harus pindah ke Link2 tanpa putus sesi kritikal (> SLA vendor).
4. Catat downtime failover (detik) + latency.
5. Pasang kembali Link1 — pastikan failback / load sesuai desain.
6. Ulangi cabut Link2 (opsional, jika waktu memungkinkan).
7. Dokumentasikan screenshot + angka di checklist.

**Jangan** test failover di jam peak merchant tanpa koordinasi PIC/NOC.
`,
  },
  {
    title: "SOP Speedtest & Validasi Bandwidth SDWAN",
    category: "SDWAN",
    content: `# Speedtest SDWAN

1. Pastikan tidak ada backup/transfer besar di LAN toko.
2. Tes dari LAN di belakang router (bukan WiFi guest).
3. Catat download/upload/latency/jitter per link bila memungkinkan.
4. Bandingkan vs kontrak ISP di work order (± toleransi vendor).
5. Foto hasil speedtest + sertakan di ticket (wajib untuk komisi SDWAN).

Jika jauh di bawah kontrak → escalate ISP + lampirkan bukti.
`,
  },

  // ─── LAN / WAN ─────────────────────────────────────────
  {
    title: "Troubleshoot LAN Toko — Tidak Ada Internet",
    category: "LAN",
    content: `# LAN Toko Down

## Layer 1–3 cepat
1. Cek power ONT/modem/router/switch.
2. LED link port — ganti kabel patch jika mati.
3. Uji laptop FE di port yang sama (DHCP).
4. \`ipconfig\` / status: dapat IP? Gateway? DNS?
5. Ping gateway → ping 8.8.8.8 → ping hostname.
6. Jika DHCP gagal: coba IP static sementara sesuai panduan NOC.
7. Cek loop / storm: banyak LED berkedip liar → cabut uplink satu-satu.

## Dokumentasi
Foto topologi sederhana + LED + hasil ping.
`,
  },
  {
    title: "SOP Crimping & Uji Kabel UTP",
    category: "LAN",
    content: `# Kabel UTP

## Standar
- Gunakan **T568A atau T568B konsisten** di kedua ujung (biasanya T568B di Indonesia).
- Jangan campur A/B (jadi crossover tidak sengaja).

## Uji
1. Cable tester: semua pin hijau berurutan.
2. Panjang wajar (<90m channel).
3. Hindari parallel dengan listrik tegangan tinggi.

Ganti kabel rusak; jangan "sambung selotip".
`,
  },
  {
    title: "Troubleshoot WAN / ISP Last Mile",
    category: "WAN",
    content: `# WAN / ISP Issue

1. Bedakan: **LAN OK tapi internet down** vs total mati.
2. Cek status ONT (PON/LOS) — LOS merah = fiber/ISP.
3. Restart ONT → tunggu sync → uji lagi.
4. Catat ticket number ISP + waktu gangguan.
5. Jika ada backup link (SDWAN/LTE): pastikan failover aktif.
6. Jangan reconfigure PPPoE/password tanpa work order.
`,
  },

  // ─── WIFI ──────────────────────────────────────────────
  {
    title: "Troubleshoot WiFi Toko — Lemah / Putus-Putus",
    category: "WIFI",
    content: `# WiFi Lemah / Instabil

1. Pastikan AP/router power & uplink LAN OK.
2. Cek channel interference (2.4 GHz ramai) — prefer channel 1/6/11 atau 5 GHz.
3. Relokasi AP: tinggi, tidak di belakang metal/microwave.
4. Pisahkan SSID guest vs kasir jika policy ada.
5. Lupa password / terlalu banyak client: koordinasi NOC untuk reset controller.
6. Uji: kecepatan + roaming antar lantai.

Foto heat-ish: posisi AP + hasil speedtest HP di titik kasir.
`,
  },

  // ─── CCTV ──────────────────────────────────────────────
  {
    title: "Troubleshoot CCTV — Kamera Offline",
    category: "CCTV",
    content: `# CCTV Offline

1. Cek power PoE / adaptor kamera.
2. Cek patch LAN ke NVR/switch — LED link.
3. Ping IP kamera dari VLAN CCTV.
4. Cek NVR: channel disabled / wrong IP / HDD full (recording stop ≠ offline).
5. Jangan reset password NVR tanpa approval customer.
6. Setelah hidup: verifikasi live view + recording.

Foto before/after live view.
`,
  },

  // ─── PRINTER / DESKTOP ─────────────────────────────────
  {
    title: "Troubleshoot Printer Kasir — Offline / Spooler",
    category: "PRINTER",
    content: `# Printer Offline

1. Power + kabel USB/LAN.
2. Di PC kasir: Devices — printer Online, set default.
3. Restart Print Spooler (Windows) bila antrian macet.
4. Driver benar untuk model; coba print test page.
5. IP printer (network): ping + buka web config.
6. Bersihkan paper jam dengan hati-hati.

Jangan install driver random dari USB tak dikenal.
`,
  },

  // ─── GENERAL / SAFETY ──────────────────────────────────
  {
    title: "SOP Safety & Etika Kunjungan Merchant",
    category: "GENERAL",
    content: `# Safety & Etika

1. Pakai ID/seragam sesuai aturan mitra.
2. Minta izin PIC sebelum masuk area kasir/rack.
3. Matikan listrik lokal hanya jika aman & seizin PIC.
4. Jangan tinggalkan lubang rack/kabel berantakan.
5. Jaga kerahasiaan: jangan foto data nasabah / struk berisi pan penuh.
6. Tolak permintaan ubah konfigurasi di luar ticket — arahkan ke NOC.
`,
  },
  {
    title: "SOP Foto Before/After & Anti-Fraud",
    category: "GENERAL",
    content: `# Dokumentasi Foto

## Wajib
- Before & After jelas, tidak blur.
- Sertakan konteks lokasi (rack/kasir), bukan hanya close-up abstrak.
- Timestamp/GPS app mengikuti check-in.

## Larangan (anti-fraud)
- Jangan reuse foto lama.
- Jangan edit berlebihan / crop yang menghilangkan bukti.
- Durasi on-site harus masuk akal untuk jenis pekerjaan (mis. install SDWAN ≠ 5 menit).
`,
  },
  {
    title: "Eskalasi L0 → L1 — Checklist Remote Dulu",
    category: "GENERAL",
    content: `# Sebelum Escalate ke L1

L0 wajib coba remote/triage:
1. Reboot perangkat remote (jika ada akses).
2. Ping / last online dari monitoring.
3. Cek alert Zabbix/Uptime — false alarm?
4. Konfirmasi ke merchant: listrik / renovasi / cabut kabel?

Isi handover: gejala, last ping, aksi remote[]. Jangan escalate "gelap" tanpa data.
`,
  },
];
