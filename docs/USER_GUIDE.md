# FE-Track — User Guide

Panduan penggunaan untuk peran operasional: Super Admin, NOC L0, NOC L1, Dispatcher, dan Field Engineer.

---

## 1. Login

1. Buka aplikasi (contoh lokal: http://localhost:3000).
2. Masuk dengan **nomor HP** + password.
3. Redirect otomatis:
   - Role admin / NOC → `/admin/dashboard`
   - Field Engineer → `/engineer/my-tickets` (wajib tanda tangan perjanjian dulu jika belum)

---

## 2. Peran & ruang kerja

| Role | Fokus |
|------|--------|
| **SUPER_ADMIN** | Semua menu admin |
| **NOC_L0** | Standby monitoring, dispatch, escalate ke L1 (wajib handover) |
| **NOC_L1** | Antrian L1, cek device, assign field engineer |
| **DISPATCHER / ADMIN_NOC** | Operasi tiket & master data |
| **FIELD_ENGINEER** | PWA ticket aktif, check-in GPS, foto, resolve |

---

## 3. Admin / NOC Console

### 3.1 Dashboard & War Room
- **Dashboard** — KPI SLA, ticket terbaru, ringkasan performa.
- **War Room** (`/admin/war-room`) — papan live: device DOWN, overdue, antrian L1, FE available. Tekan **F** untuk fullscreen; refresh otomatis ~12 detik.

### 3.2 Peta
Sebaran toko & engineer (Mapbox). Status device hijau/merah.

### 3.3 Routing (L0 → L1)
1. **L0 Inbox** — ticket OPEN / ESCALATED / pending sparepart yang belum ke L1.
2. Klik **ke L1** → isi **Handover** wajib:
   - Gejala
   - Last ping / status monitor
   - Aksi remote yang sudah dicoba
3. **L1 Queue** — claim ticket, buka detail, assign FE.
4. **Waiting Accept** — ticket ASSIGNED belum di-accept FE; countdown **15 menit** sebelum cron re-assign.

### 3.4 Tickets
- Buat ticket (manual / dari monitoring).
- Detail ticket: timeline, foto, anti-fraud, **SLA by phase**, **Stop Clock**, escalate L0→L1, assign engineer.
- **Stop Clock**: pause SLA dengan alasan (≥5 karakter); Resume menggeser due date.
- Jika **total pause bank ≥ threshold** (default 2 jam, env `STOP_CLOCK_APPROVAL_HOURS`), role non-L1 harus **minta approve L1** dulu. L1 Approve/Reject di panel aksi.

### 3.5 Master data
- **Tenants / Devices / Kategori / Spareparts / KB**
- Spareparts: Export/Import Excel dengan **preview** sebelum commit.
- Ikon **History** di sparepart → ledger mutasi IN/OUT/ADJUST (tied ke ticket jika consume).

### 3.6 Mitra
- Engineers, sertifikasi skill, recruitment kandidat, leaderboard, legal perjanjian.

### 3.7 Keuangan & laporan
- Payroll / wallet engineer.
- **Reports**: filter tenant/kota/periode → Excel atau **PDF Customer**.
- **Pause Audit**: ticket dengan pause tinggi; flag *Leakage* jika tanpa jejak sparepart.

### 3.8 Integrasi
- API key customer ITSM, webhook outbound.
- **Webhook DLQ**: antrian gagal kirim — Process now / Replay / mark DEAD.

### 3.9 Notifikasi (Bell + FCM)
Notifikasi in-app: ticket baru, escalate L1, assign, stop clock, approve stop clock. Poll ~30 detik.
Push FCM (opsional): set `FCM_SERVER_KEY` + `NEXT_PUBLIC_FIREBASE_*` — FE PWA auto-register token.

---

## 4. Field Engineer (PWA)

### 4.1 Sebelum kerja
1. Install PWA di HP (Add to Home Screen) jika tersedia.
2. Tanda tangan **Perjanjian Kemitraan** di `/engineer/agreement`.
3. Pastikan GPS aktif.

### 4.2 Alur ticket
1. **Accept / Reject** job yang di-assign.
2. **ON THE WAY** — GPS dicatat.
3. **CHECK-IN ON SITE** — harus dalam radius ~100m dari toko.
4. Checklist perangkat → **IN PROGRESS**.
5. Upload foto **Before / After** (otomatis di-compress), notes, centang ping/LAN → **RESOLVED**.
6. Escalate / butuh sparepart bila perlu.

### 4.3 Offline
- Aksi & foto disimpan lokal jika offline.
- Saat online, tekan badge **Sync**.
- Jika ada **Conflict** (status server sudah berubah), buang aksi conflict dari badge.

### 4.4 Lainnya
- History, wallet/withdraw, leaderboard, Knowledge Base SOP.

---

## 5. Alur bisnis singkat (ticket)

```
OPEN → (auto-dispatch) ASSIGNED → ON_THE_WAY → ON_SITE → IN_PROGRESS → RESOLVED → CLOSED
         ↘ ESCALATED / PENDING_L1 (handover L0→L1)
         ↘ PENDING_SPAREPART
         ↘ Stop Clock (pause SLA)
```

Duplicate alert (device yang sama masih open) digabung ke ticket existing — tidak buat ticket baru.

---

## 6. Tips operasi

- L0 jangan escalate tanpa handover lengkap.
- Stop clock hanya untuk alasan bisnis valid (vendor, akses toko, dll.).
- Pantau War Room saat peak / mass outage.
- Cek Pause Audit mingguan untuk kebocoran SLA.
- Cek Webhook DLQ jika customer ITSM tidak menerima update.

---

## 7. Bantuan terkait

| Dokumen | Isi |
|---------|-----|
| [Manual Guide](./MANUAL_GUIDE.md) | Setup teknis, env, cron, deploy |
| [ERD](./ERD.md) | Model data & relasi |
| [Business Plan](./BUSINESS_PLAN.md) | Model bisnis & roadmap |
| [INTEGRATION_TESTING.md](../INTEGRATION_TESTING.md) | Uji Open API / webhook |
| [FRAUD_TESTING.md](../FRAUD_TESTING.md) | Uji anti-fraud |
| [LEGAL_COMPLIANCE.md](../LEGAL_COMPLIANCE.md) | Perjanjian mitra |
