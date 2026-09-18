# FE-Track — Business Plan

**Produk:** FE-Track — Field Engineer Dispatch & SLA Management  
**Fokus:** Monitoring & perbaikan EDC / LAN / WAN / SDWAN di jaringan toko nasional (Indonesia)  
**Target SLA:** Meet **99%** untuk tier yang disepakati

---

## 1. Executive summary

FE-Track adalah platform operasional yang menghubungkan **NOC (L0/L1)**, **dispatcher**, dan **field engineer freelance** untuk merespons gangguan perangkat di ribuan titik retail.

Nilai utama:
- Auto-dispatch engineer terdekat + cocok skill/sertifikasi
- **Dual engagement**: Mitra (komisi) dan PKWT outtask/internal (payroll + placement)
- SLA countdown, stop-clock, dan laporan fase (response / travel / repair)
- Jejak audit GPS + foto before/after + anti-fraud
- Integrasi monitoring (Zabbix/Uptime) & ITSM customer via API/webhook
- Model mitra (perjanjian e-sign, wallet, leaderboard, recruitment) + HR kontrak PKWT

---

## 2. Masalah pasar

| Pain point | Dampak |
|------------|--------|
| Ticket manual & WhatsApp group | Lambat, tidak terukur, sulit SLA |
| Engineer salah skill / jauh | Biaya tinggi, breach |
| Alert monitoring spam | Duplikasi ticket, noise NOC |
| Tidak ada bukti on-site | Dispute dengan bank/merchant |
| Komisi tidak transparan | Churn engineer |

---

## 3. Solusi & diferensiasi

1. **Ops maturity L0→L1** — triage + handover wajib sebelum assign FE.
2. **Dispatch cerdas** — jarak (PostGIS/haversine) + skill alias + sertifikasi aktif.
3. **SLA governance** — stop-clock beralasan, pause audit, PDF laporan customer.
4. **Trust layer** — check-in 100m, EXIF/hash foto, fraud hold commission (Mitra).
5. **Dual workforce** — Mitra (PWA, wallet, recruitment) + PKWT (kontrak, placement, payroll HR).

---

## 4. Customer & persona

| Segmen | Contoh | Value |
|--------|--------|--------|
| **Bank / acquirer EDC** | BCA/BRI merchant network | SLA report, audit trail |
| **ISP / SDWAN MSP** | Managed router toko | Dispatch + sertifikasi |
| **Retail chain / franchise** | Minimarket nasional | Satu dashboard multi-site |
| **NOC outsourcer** | Vendor field service | L0/L1 + FE marketplace |

Persona internal:
- **NOC L0** — monitoring & escalate
- **NOC L1** — diagnosis & assign
- **Field Engineer Mitra** — freelance / fee per ticket
- **Field Engineer PKWT** — kontrak outtask/internal + placement
- **Ops Manager** — SLA %, cost, coverage
- **HR / ADMIN_NOC** — kontrak PKWT & klasifikasi engagement

---

## 5. Model pendapatan (usulan)

| Stream | Deskripsi | Contoh pricing |
|--------|-----------|----------------|
| **SaaS subscription** | Per tenant aktif / bulan | Rp X / toko / bln |
| **Ticket fee** | Markup customer − fee engineer | Paket ServicePackage |
| **Integration fee** | Open API + webhook + SLA PDF | Setup + retainer |
| **Premium NOC** | War room, dedicated L1 | Kontrak bulanan |
| **Recruitment / certify** | Onboarding FE berbayar | Per batch / sertifikasi |

Margin berasal dari selisih `price_customer` vs `fee_engineer` di `ServicePackage` + komisi aturan `CommissionRule` (**Mitra**). Engineer **PKWT** dihitung via payroll HR (bukan wallet ticket).

---

## 6. Unit economics (kerangka)

Untuk tiap ticket resolved ontime:
- Revenue customer (paket) − fee FE − bonus ontime + penalty breach (jika ada)
- Cost platform: hosting, WA gateway, Mapbox, support NOC

KPI yang dilacak di produk:
- SLA Meet %
- MTTR / fase (response, travel, repair, pause)
- Engineer available vs coverage kota
- Fraud hold rate
- Webhook success vs DLQ

---

## 7. Go-to-market

### Fase 1 — Beachhead (3–6 bulan)
- 1–2 bank/EDC pilot di Jabodetabek (Tier 1)
- Soft-launch 1–3 kota; ukur SLA 99% target
- Onboard 50–100 FE terverifikasi

### Fase 2 — Expand (6–18 bulan)
- Tier 2/3 kabupaten; SDWAN & multi-kategori
- White-label laporan PIC customer
- Marketplace FE + coordinator recruitment

### Fase 3 — Platform (18+ bulan)
- Multi-tenant enterprise
- FCM push + offline keras nasional
- Analytics capacity planning / heatmap breach

---

## 8. Roadmap produk (selaras build saat ini)

| Status | Item |
|--------|------|
| ✅ | Ticketing, dispatch, PWA FE, map, wallet |
| ✅ | L0/L1 routing + handover, stop-clock, bell |
| ✅ | Duplicate merge, skill/cert match |
| ✅ | SLA phases, pause audit, customer PDF |
| ✅ | War Room, offline harden, webhook DLQ |
| ✅ | FCM push, stock mutation ledger |
| ✅ | **Mitra vs PKWT** (eligibility, kontrak, placement, isolasi pay) |
| ✅ | Cron remind kontrak + audit flip UI + residual payout + payroll Mitra-only export |
| ⏭ | Customer portal self-serve status |
| ⏭ | Role matrix UI & playbook auto dari alert |

---

## 9. Kompetisi & positioning

| Pendekatan lama | FE-Track |
|-----------------|----------|
| ITSM generik | Field-first + GPS + foto wajib |
| Spreadsheet + WA | Realtime NOC + SLA clock |
| Vendor tunggal FE | Freelance network + sertifikasi |
| Tanpa bukti fraud | Anti-fraud + hold komisi |

Positioning: **"SLA field ops OS untuk jaringan toko Indonesia."**

---

## 10. Tim & operasi

| Fungsi | Tanggung jawab |
|--------|----------------|
| Product / Eng | Next.js platform, integrasi |
| NOC L0/L1 | 24/7 atau shift sesuai kontrak |
| Dispatcher | Peak / mass outage |
| People ops | Recruitment Mitra & kontrak PKWT |
| Finance | Payroll wallet Mitra, invoice customer, payroll HR PKWT |

---

## 11. Risiko & mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Coverage FE tipis di daerah | Coordinator lokal + bonus tier 3 |
| Abuse stop-clock | Pause audit + approval rule |
| Fake GPS / foto | Fraud engine + hold commission (Mitra); flag log PKWT |
| Klasifikasi kerja salah | Engagement gate + kontrak RBAC + audit log |
| Ketergantungan WA gateway | In-app bell + FCM |
| Dispute SLA customer | PDF fase + ticket log immutable |

---

## 12. Proyeksi sukses (12 bulan — indikator)

- ≥ **95–99%** SLA meet pada tenant pilot
- ≥ **N** ticket/bulan dengan MTTR sesuai tier
- Churn FE rendah (wallet cair tepat waktu)
- ≥ 1 kontrak enterprise berintegrasi ITSM

*(Angka finansial detail diisi setelah pricing final & cost hosting.)*

---

## 13. Call to action

1. Soft-launch 1 kota dengan War Room + Routing L0/L1.
2. Paket PDF SLA bulanan ke PIC customer.
3. Rekrut FE kota berikutnya berdasarkan heatmap overdue.

Dokumen terkait: [User Guide](./USER_GUIDE.md) · [Manual Guide](./MANUAL_GUIDE.md) · [Engagement](./ENGAGEMENT.md) · [ERD](./ERD.md)
