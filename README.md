# FE-Track

Platform Field Engineer Dispatch & SLA Management untuk monitoring EDC/LAN/WAN di ribuan toko se-Indonesia.

Stack: **Next.js 14** (App Router) · **TypeScript** · **Tailwind** · **Prisma** · **PostgreSQL + PostGIS** · **NextAuth v5** · **Mapbox** · **PWA**

---

## Prerequisites

- Node.js 20+
- Docker Desktop (Postgres PostGIS, pgAdmin, MinIO)
- (Opsional) Mapbox token & Fonnte token

---

## Quick start

```bash
# 1. Jalankan database & storage
docker compose up -d

# 2. Install dependency
npm install

# 3. Env
cp .env.example .env
# Pastikan DATABASE_URL pakai port 5433 (mapping docker)
# DATABASE_URL="postgresql://postgres:password@127.0.0.1:5433/fetrack"

# 4. Migration + seed
npx prisma migrate dev
npx prisma db seed

# 5. Dev server
npm run dev
```

Buka http://localhost:3000

### Akun seed (local/dev only)

| Role | Phone | Password |
|------|-------|----------|
| Super Admin | `081111111111` | lihat seed / ganti setelah setup |
| Field Engineer | `081222222001` (sampai ~030) | sama |

Jangan pakai kredensial seed di production.

Seed berisi **100 tenant** se-Indonesia, **30 engineer**, dan stok sparepart.

---

## Docker services

| Service | URL / Port |
|---------|------------|
| Postgres (PostGIS) | `localhost:5433` |
| pgAdmin | http://localhost:5050 |
| MinIO API | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |

---

## Cron auto-dispatch

Endpoint: `GET /api/cron/check-dispatch`  
Auth: header `Authorization: Bearer <CRON_SECRET>` (wajib; tanpa secret → 401)

Cek ticket `ASSIGNED` yang belum accept → re-assign / escalate.

### macOS / Linux (crontab tiap 1 menit)

```bash
crontab -e
```

Tambahkan:

```cron
* * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/check-dispatch" >/dev/null 2>&1
```

### Manual test

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/check-dispatch"
```

### Monitoring webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/monitoring \
  -H "Authorization: Bearer $MONITORING_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tenant_code":"BRI-JKT-001","description":"EDC down"}'
```

---

## Script berguna

```bash
npm run dev          # Next.js dev
npm run build        # Production build
npm run db:migrate   # prisma migrate dev
npm run db:seed      # prisma db seed
npm run db:studio    # Prisma Studio
```

---

## Fitur utama

- Auto dispatch engineer terdekat (PostGIS / haversine fallback)
- SLA countdown & report Excel
- Dashboard KPI + grafik
- Peta monitoring tenant & engineer
- PWA field engineer (GPS check-in 100m, offline, offline sync)
- Inventory sparepart (gudang / engineer)
- Performance detail per engineer
- Open API & Webhook integrasi customer ITSM (`/admin/integrations`)

Lihat juga: [INTEGRATION_TESTING.md](./INTEGRATION_TESTING.md)

---

## Struktur penting

```
app/admin/          # Dashboard NOC
app/engineer/       # PWA field engineer
app/actions/        # Server Actions
app/api/            # REST + webhook + cron
lib/dispatch.ts     # Auto dispatch engine
lib/sla.ts          # Perhitungan SLA meet / MTTR
prisma/             # Schema, migrations, seed
```

---

## Env penting

Lihat `.env.example`:

- `DATABASE_URL`
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_MAPBOX_TOKEN` (opsional — tanpa token map pakai fallback list)
- `FONNTE_TOKEN` (opsional — WA notifikasi)
- `CRON_SECRET`
- `MONITORING_WEBHOOK_SECRET`
