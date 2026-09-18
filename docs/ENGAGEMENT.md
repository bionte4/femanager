# FE-Track — Mitra vs PKWT (Engagement)

Dokumen kanonik klasifikasi kerja Field Engineer: **Mitra** (komisi wallet) vs **PKWT** (payroll HR).  
Sumber kode: `lib/eligibility.ts`, `lib/contracts.ts`, `lib/dispatch.ts`, `app/actions/contracts.ts`.

---

## 1. Ringkasan

| Aspek | MITRA | PKWT_OUTTASK / PKWT_INTERNAL |
|-------|-------|------------------------------|
| Legal | Perjanjian kemitraan e-sign | Kontrak kerja `EngineerContract` |
| Eligible kerja | `partnership_status = SIGNED` | `employment_status = ACTIVE` + kontrak ACTIVE dalam masa berlaku |
| Bayaran | Komisi wallet / ticket | Payroll HR (bukan fee ticket) |
| Wallet UI | Full (histori + withdraw) | Dibatasi; sisa saldo masa Mitra bisa ditampilkan |
| Leaderboard | Ya | Tidak (MITRA-only) |
| Reject job | Bebas (bukti kemitraan) | Diblok keras |
| Accept timeout 15m | Re-assign / escalate biasa | Escalate khusus PKWT + notifikasi |
| Placement | Semua kota (selama eligible) | Filter `placement_cities` / `placement_tenant_ids` |
| Anti-fraud hold | Hold komisi (`PENDING_REVIEW`) | Flag log saja (tanpa hold wallet) |

Default seed / user baru: `engagement_type = MITRA`, `employment_status = NONE`.

---

## 2. Model data

### User
- `engagement_type`: `MITRA` | `PKWT_OUTTASK` | `PKWT_INTERNAL`
- `employment_status`: `NONE` | `ACTIVE` | `SUSPENDED` | `ENDED` (relevan untuk PKWT)

### EngineerContract
- `type`: `PKWT_OUTTASK` | `PKWT_INTERNAL`
- `status`: `DRAFT` → `ACTIVE` → `SUSPENDED` / `ENDED` / `EXPIRED`
- `placement_cities[]`, `placement_tenant_ids[]` — filter dispatch & manual assign
- `document_url` — **https only**
- `client_label` — label admin (bukan filter keras)

### EngagementChangeLog
Audit flip `MITRA ↔ PKWT_*` (reason + `changed_by`).

---

## 3. Eligibility (`eligibleForWork`)

Gate pusat dipakai layout engineer, accept job, dan **manual assign** admin:

1. Role `FIELD_ENGINEER`, tidak `is_suspended`
2. **Mitra** → evaluasi partnership SIGNED
3. **PKWT** → employment ACTIVE + ada kontrak ACTIVE (`start_at ≤ now ≤ end_at`)

Halaman blokir: `/engineer/employment-blocked`.

---

## 4. Dispatch & assign

### Auto-dispatch (`lib/dispatch.ts`)
- Query engineer: `dispatchEligibleWhere()` (Mitra signed **atau** PKWT + kontrak aktif)
- PKWT: wajib `matchesPlacement(contract, tenant)` pada salah satu kontrak aktif
- Skill / sertifikasi / trust tetap berlaku

### Manual assign (`assignEngineerAction`)
Sama ketat: `eligibleForWork` + placement PKWT + skill match.  
Assign admin **tidak** boleh bypass placement.

### Accept timeout
Cron `check-dispatch`: Mitra re-assign biasa; PKWT → `escalatePkwtAcceptTimeout` + notifikasi.

---

## 5. Admin HR & RBAC kontrak

| Aksi | Role |
|------|------|
| CRUD kontrak, inbox expire, aktivasi/suspend/end/extend | **SUPER_ADMIN**, **ADMIN_NOC** saja (`CONTRACT_ADMIN_ROLES`) |
| Switch engagement MITRA ↔ PKWT | **SUPER_ADMIN** only |
| Menu sidebar “Kontrak PKWT” | Hanya role di atas |
| Dispatcher / NOC_L0 / NOC_L1 | Tidak manage kontrak |

UI:
- `/admin/hr/contracts` — inbox hampir expire (30 hari)
- `/admin/engineers/[id]/contracts` — kelola per engineer

### Aturan mutasi sensitif
- Flip engagement diblok jika ada withdrawal `PENDING` / `APPROVED`
- Create + `activate_now`: flip engagement + insert kontrak **atomic** (1 transaction)
- Extend EXPIRED/ENDED → ACTIVE: sync `engagement_type` via `ensureEngagementForContract`
- Suspend 1 kontrak: `employment_status = SUSPENDED` **hanya** jika tidak ada kontrak ACTIVE lain
- End kontrak: `employment_status = ENDED` jika tidak ada ACTIVE tersisa

Cron: `GET/POST /api/cron/expire-contracts` (Bearer `CRON_SECRET`).

---

## 6. Isolasi pembayaran (D5)

| Path | Perilaku |
|------|----------|
| `calculateCommission` | Non-Mitra: skip wallet, tandai calculated |
| Wallet adjustment | Hanya Mitra |
| Antifraud on resolve | Mitra → hold komisi; PKWT → log saja |
| Leaderboard | Query MITRA-only |
| `GET /api/engineer/wallet` + `getMyWallet` | PKWT: strip histori/totals (`pkwt_restricted`) |
| `requestWithdrawal` / history | Mitra-only |

Payroll admin (`/admin/payroll`): wallet Mitra; PKWT lewat proses HR di luar wallet ticket.

---

## 7. UX engineer (D3)

- Bottom nav: sembunyikan wallet / rank untuk PKWT
- Profile: badge tipe engagement + status kemitraan **atau** kontrak
- Wallet page PKWT: pesan payroll HR; tampilkan sisa saldo masa Mitra jika ada
- Admin engineers: filter & badge engagement

---

## 8. API & middleware

`/api/*` dilindungi session kecuali:
- `/api/auth`
- `/api/cron`
- `/api/webhooks`
- `/api/v1/external`
- `/api/candidates`

---

## 9. Checklist operasi

- [ ] Kontrak baru: set placement kota/tenant sesuai client
- [ ] Aktivasi hanya oleh SUPER_ADMIN / ADMIN_NOC
- [ ] Sebelum flip Mitra→PKWT: selesaikan withdrawal pending
- [ ] Cron `expire-contracts`, `remind-contracts`, `check-dispatch` jalan
- [ ] Inbox `/admin/hr/contracts` dicek mingguan (+ audit flip)
- [ ] Residual Mitra→PKWT: cairkan via payroll / form engineer
- [ ] Export payroll: sheet Mitra terpisah dari Residual PKWT
- [ ] Jangan assign manual PKWT ke luar placement

---

## 10. Referensi kode

| Area | File |
|------|------|
| Eligibility | `lib/eligibility.ts` |
| Placement / expire / remind | `lib/contracts.ts` |
| Dispatch | `lib/dispatch.ts` |
| Contract actions | `app/actions/contracts.ts` |
| Commission isolasi | `lib/commission.ts` |
| Payroll Mitra + residual | `app/actions/payroll.ts` |
| Manual assign | `app/actions/tickets.ts` → `assignEngineerAction` |
| Role constants | `lib/auth.config.ts` → `CONTRACT_ADMIN_ROLES` |
| Cron remind | `app/api/cron/remind-contracts` |

Dokumen terkait: [LEGAL_COMPLIANCE.md](../LEGAL_COMPLIANCE.md) (Mitra) · [USER_GUIDE.md](./USER_GUIDE.md) · [ERD.md](./ERD.md)
