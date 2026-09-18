# Fraud Testing Guide (PROMPT 12)

Cara verifikasi Anti-Fraud & Leaderboard tanpa mock di UI.

## Persiapan

1. Pastikan migration sudah jalan: `npx prisma migrate deploy`
2. Seed (opsional, isi 3 FraudLog dummy): `npx prisma db seed`
3. Login admin → `/admin/fraud-center` harus menampilkan KPI + logs
4. Login engineer → bottom nav **Rank** → `/engineer/leaderboard`

## Test 1 — Foto tanpa EXIF GPS → LOW

1. Ambil screenshot / foto yang sudah di-strip EXIF (WhatsApp often strips GPS).
2. Engineer resolve ticket: upload sebagai Before (+ After).
3. Setelah RESOLVED, cek `/admin/fraud-center` → Fraud Logs.
4. Harus muncul type `FAKE_GPS` severity **LOW**.
5. Trust score turun sedikit; engineer **tidak** auto-suspend.

Manual trigger:
```bash
curl -X POST http://localhost:3000/api/fraud/check/<TICKET_ID> \
  -H "Cookie: <session>"
```

## Test 2 — Foto duplicate → PHOTO_DUPLICATE HIGH

1. Resolve ticket A dengan foto X (simpan file yang sama).
2. Resolve ticket B dengan **file byte-sama** (copy paste file).
3. Sistem hash SHA256 foto original sebelum compress.
4. Harus flag `PHOTO_DUPLICATE` severity **HIGH**.
5. Ticket B status → `PENDING_REVIEW`, komisi **tidak** cair (**Mitra only** — hold wallet).
6. Engineer **PKWT**: flag fraud tetap dicatat di ticket log; **tidak** ada hold komisi / `PENDING_REVIEW` wallet (bayaran lewat payroll HR). Lihat [docs/ENGAGEMENT.md](./docs/ENGAGEMENT.md).
7. Di Fraud Center tab **Pending Review** → Approve & Bayar / Reject & Suspend (alur Mitra).

## Test 3 — EXIF GPS mismatch → PHOTO_GPS_MISMATCH HIGH

1. Pakai foto yang punya EXIF GPS (ambil dari kamera HP, pastikan Location On).
2. Saat check-in / resolve, kirim lat/lng yang jauh (>500m) dari EXIF.
   - Cara mudah: check-in di lokasi toko A, upload foto yang diambil di lokasi jauh.
3. Flag `PHOTO_GPS_MISMATCH` HIGH + metadata `claimed_*` vs `exif_*` + `distance_meter`.
4. Di ticket detail `/admin/tickets/[id]` section **Anti-Fraud** tampil 2 titik map link.
5. Ticket masuk `PENDING_REVIEW`.

## Test 4 — Fast resolve / time anomaly

1. INCIDENT EDC: status `ON_SITE` → `RESOLVED` dalam <5 menit → `FAST_CHECKIN` MEDIUM.
2. `ON_THE_WAY` → `ON_SITE` dengan tenant ~20km tapi waktu <5 menit → `TIME_ANOMALY` HIGH.

## Test 5 — Auto suspend

1. Kumpulkan **≥2 fraud HIGH** dalam 7 hari untuk 1 engineer.
2. `User.is_suspended = true`, status OFFLINE, tidak bisa update ticket lagi.

## Test 6 — Leaderboard

1. Admin: `/admin/leaderboard` → pilih period → **Recalculate**.
2. Atau: `POST /api/leaderboard/recalculate` body `{"period":"month"}`.
3. `GET /api/leaderboard?period=month` atau `?period=2025-01`.
4. Engineer **Mitra**: `/engineer/leaderboard` tampil rank sendiri + top 10. Engineer **PKWT** tidak masuk ranking / nav Rank disembunyikan.
5. Export CSV dari admin leaderboard.

Score formula:
`(SLA meet * 0.4) + (min(100, 1000/avg_resolve) * 0.3) + (trust * 0.3) - (fraud_count * 10)`

## Acceptance checklist

- [ ] Upload tanpa GPS → LOW tercatat
- [ ] Foto sama 2 ticket → PHOTO_DUPLICATE HIGH
- [ ] Check-in vs EXIF beda jauh → PHOTO_GPS_MISMATCH
- [ ] HIGH fraud **Mitra** → PENDING_REVIEW, komisi ditahan
- [ ] HIGH fraud **PKWT** → flag log, tanpa hold wallet
- [ ] Admin Approve → RESOLVED + komisi cair (Mitra)
- [ ] Admin Reject → CLOSED + suspend
- [ ] Leaderboard recalculate tampil di admin & engineer Mitra
