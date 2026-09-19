# FE-Track — Manual Guide (Teknis & Operasional)

Panduan instalasi, konfigurasi, operasi harian, dan troubleshooting untuk tim IT / DevOps / Admin sistem.

---

## 1. Arsitektur ringkas

```
Browser (Admin / Engineer PWA)
        │
        ▼
Next.js 14 App Router  ── NextAuth (JWT)
        │
        ├── Prisma → PostgreSQL (+ PostGIS)
        ├── Storage foto (local / MinIO)
        ├── Mapbox GL
        ├── WhatsApp gateway (Fonnte/dll, opsional)
        └── Cron + Webhook outbound / DLQ
```

---

## 2. Prerequisites

- Node.js **20+**
- Docker Desktop (Postgres PostGIS, pgAdmin, MinIO)
- npm
- (Opsional) Mapbox token, Fonnte/WA token, FCM

---

## 3. Instalasi lokal

```bash
git clone https://github.com/bionte4/femanager.git
cd femanager   # atau app-fe

docker compose up -d
npm install
cp .env.example .env
# Edit DATABASE_URL → port 5433

npx prisma migrate dev
npx prisma db seed
npm run dev
```

App: http://localhost:3000

### Akun seed (dev only)

| Role | Phone | Password |
|------|-------|----------|
| Super Admin | `081111111111` | `password123` (seed) |
| NOC L0 | `081111111112` | `password123` |
| NOC L1 | `081111111113` | `password123` |
| Field Engineer | `081222222001` … | `password123` |

**Jangan** pakai di production. Ganti password segera setelah demo.

---

## 4. Environment variables

Lihat `.env.example`. Yang penting:

| Variable | Fungsi |
|----------|--------|
| `DATABASE_URL` | Postgres (contoh port `5433`) |
| `NEXTAUTH_SECRET` | Secret JWT NextAuth |
| `NEXTAUTH_URL` | Base URL app |
| `CRON_SECRET` | Bearer cron (wajib; tanpa secret → 401) |
| `MONITORING_WEBHOOK_SECRET` | Auth webhook Zabbix/Uptime |
| `MAPBOX_TOKEN` / `NEXT_PUBLIC_MAPBOX_*` | Peta |
| Token WA gateway | Notifikasi assign (opsional) |
| `STOP_CLOCK_APPROVAL_HOURS` | Threshold pause bank → butuh L1 (default `2`) |
| `FCM_SERVER_KEY` | Legacy FCM server key (opsional) |
| `NEXT_PUBLIC_FIREBASE_*` + `VAPID_KEY` | Client register push token (opsional) |

---

## 5. Database

```bash
npx prisma migrate dev          # apply migrations
npx prisma db seed              # data demo
npx prisma studio               # GUI
```

Setelah menambah model baru di schema, jika HMR error `findMany` undefined:

```bash
npx prisma generate
# restart npm run dev
```

Guard stale client ada di `lib/prisma.ts`.

---

## 6. Cron jobs

Auth: `Authorization: Bearer <CRON_SECRET>`

| Endpoint | Interval saran | Fungsi |
|----------|----------------|--------|
| `GET/POST /api/cron/check-dispatch` | 1 menit | Re-assign / escalate ticket ASSIGNED belum accept (PKWT escalate khusus) |
| `GET/POST /api/cron/expire-contracts` | harian | Status kontrak PKWT lewat `end_at` → `EXPIRED` |
| `GET/POST /api/cron/remind-contracts` | harian | WA reminder engineer+admin saat sisa hari tepat 30/14/7/3 |
| `GET/POST /api/cron/webhook-dlq` | 1–5 menit | Retry outbound webhook gagal |
| `GET/POST /api/cron/remind-candidates` | harian | Reminder recruitment (jika dipakai) |

Contoh crontab:

```cron
* * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://YOUR_HOST/api/cron/check-dispatch
0 2 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://YOUR_HOST/api/cron/expire-contracts
0 9 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://YOUR_HOST/api/cron/remind-contracts
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://YOUR_HOST/api/cron/webhook-dlq
```

---

## 7. Integrasi monitoring & Open API

### Webhook monitoring
`POST /api/webhooks/monitoring`  
Header: `Authorization: Bearer <MONITORING_WEBHOOK_SECRET>` atau `X-Webhook-Secret`

Body minimal: `tenant_code` / `tenant_id`, `device_serial` (opsional), `description`, `priority`.

Jika device sudah punya ticket open → **merge** (`merged: true`), bukan ticket baru.

### External / customer API
Lihat `INTEGRATION_TESTING.md` dan `/admin/integrations/docs`.

Outbound status → customer webhook; gagal setelah retry → **Webhook DLQ** (`/admin/integrations/dlq`).

---

## 8. Fitur operasional penting (teknis)

| Fitur | Lokasi kode / UI |
|-------|------------------|
| Auto-dispatch + skill/cert match | `lib/dispatch.ts`, `lib/skill-match.ts` |
| Mitra vs PKWT eligibility | `lib/eligibility.ts`, [ENGAGEMENT.md](./ENGAGEMENT.md) |
| Kontrak PKWT + placement | `lib/contracts.ts`, `app/actions/contracts.ts`, `/admin/hr/contracts` |
| Integrasi WA / SMTP / AI | `/admin/settings/integrations`, `lib/app-settings.ts` |
| Duplicate ticket merge | `lib/tickets/dedupe.ts` |
| Handover L0→L1 | `l1_handover` JSON + `components/ticket/handover-form.tsx` |
| Stop clock SLA | `lib/stop-clock.ts`, aksi di detail ticket |
| SLA by phase | `lib/sla-phases.ts`, Reports + detail ticket |
| Offline queue FE | `hooks/use-offline-sync.ts` |
| War Room | `/admin/war-room` |
| Customer SLA PDF | `lib/reports/customer-sla-pdf.ts` |
| Commission isolasi Mitra | `lib/commission.ts` |
| API session gate | `middleware.ts` + `lib/auth.config.ts` |

---

## 9. Checklist go-live

Lihat juga checklist VPS lengkap: [DEPLOYMENT_VPS.md](./DEPLOYMENT_VPS.md).

- [ ] Ganti semua secret env (NextAuth, Cron, Webhook)
- [ ] Hapus / ganti akun seed; buat admin production
- [ ] RLS/backup Postgres terjadwal
- [ ] Cron terpasang & monitored (`check-dispatch`, `expire-contracts`, `remind-contracts`, `webhook-dlq`)
- [ ] Mapbox token production
- [ ] Storage foto (`public/uploads`) + backup
- [ ] Uji webhook customer + DLQ replay
- [ ] Uji GPS check-in 100m di lapangan
- [ ] Soft-launch 1 kota sebelum nasional
- [ ] Proses HR untuk engineer PKWT (kontrak + placement) terdokumentasi
- [ ] Role kontrak: hanya SUPER_ADMIN / ADMIN_NOC yang kelola PKWT
- [ ] HTTPS + `NEXTAUTH_URL` domain production

---

## 10. Troubleshooting

| Gejala | Cek |
|--------|-----|
| `prisma.X.findMany` undefined | `prisma generate` + restart dev server |
| Cron 401 | `CRON_SECRET` set & header Bearer benar |
| Ticket tidak auto-assign | Engineer AVAILABLE + skill/cert + lat/lng + eligible (Mitra signed / PKWT kontrak + placement) |
| Check-in ditolak | Jarak > 100m atau GPS lemah |
| Manual assign PKWT gagal | Di luar `placement_cities` / `placement_tenant_ids` |
| Customer tidak dapat update | War Room KPI Webhook DLQ / halaman DLQ |
| Sidebar menu hilang | Scroll nav; footer fixed bawah; menu Kontrak hanya SA/ADMIN_NOC |

---

## 11. Struktur folder (inti)

```
app/
  (admin)/…          # NOC console
  engineer/…         # PWA FE
  api/…              # REST, cron, webhooks
  actions/…          # Server Actions
components/
lib/                 # domain logic
prisma/              # schema + migrations + seed
docs/                # dokumentasi produk
```

---

## 12. Referensi

- [User Guide](./USER_GUIDE.md)
- [Engagement Mitra/PKWT](./ENGAGEMENT.md)
- [Deployment VPS](./DEPLOYMENT_VPS.md)
- [ERD](./ERD.md)
- [Business Plan](./BUSINESS_PLAN.md)
- Root [README.md](../README.md)
