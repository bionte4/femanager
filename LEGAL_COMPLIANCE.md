# Legal Compliance — Model Kemitraan FE-Track

Dokumen ini menjelaskan mengapa FE-Track memakai **model kemitraan** (bukan hubungan kerja), bagaimana aplikasi membuktikan kepatuhan, dan bagaimana menjawab pertanyaan Disnaker.

## Kenapa model kemitraan aman?

FE-Track adalah **platform marketplace jasa teknis** yang mempertemukan permintaan perbaikan/instalasi dengan mitra teknisi mandiri. Mitra:

1. **Bebas menolak job** — tombol TOLAK JOB + `ComplianceLog` type `JOB_REJECT` + field `ticket.rejected_by`
2. **Tidak ada jam kerja / shift** — status ONLINE/OFFLINE dan accept/reject ditentukan mitra
3. **Fee per job**, bukan gaji bulanan — wallet + payroll disclaimer
4. **Alat milik sendiri** — `tools_owned`, motor/toolkit/bor/tangga dari form join
5. **Boleh kerja di tempat lain** — `can_work_for_others = true`

Sebelum ambil job, mitra wajib tanda tangan **Perjanjian Kemitraan** digital (`/engineer/agreement`).

## 3 unsur hubungan kerja yang dihindari

Menurut praktik UU Ketenagakerjaan / UU Cipta Kerja, hubungan kerja biasanya mengandung:

| Unsur | Dihindari di FE-Track |
|-------|------------------------|
| **Pekerjaan** tertentu yang diperintahkan | Mitra memilih job; boleh tolak tanpa suspend otomatis |
| **Upah** (gaji tetap) | Hanya fee per ticket closed; tidak ada THR/BPJS TK/pesangon dari platform |
| **Perintah** (subordinasi jam & cara kerja) | Tidak ada jam wajib; mitra atur sendiri waktu & alat |

Bukti di sistem: accept/reject log, timeout 15 menit (bukan sanksi berat), trust −1 saja saat tolak, dan audit trail unsigned-dengan-job harus 0.

## Cara jawab jika Disnaker bertanya

1. Tunjukkan **Perjanjian Kemitraan** aktif + daftar `EngineerAgreement` SIGNED di `/admin/legal`
2. Export **Compliance Report** (CSV) yang memuat log `JOB_REJECT` — bukti mitra sering/mampu menolak
3. Tunjukkan bahwa reject **tidak** memicu auto-suspend (hanya −1 trust + notifikasi)
4. Tunjukkan fee wallet = pendapatan kemitraan, footer payroll menyatakan bukan upah
5. Tunjukkan `tools_owned` dan `can_work_for_others`

## Referensi fitur di app

- Template & CRUD: `/admin/legal`
- E-sign mitra: `/engineer/agreement`
- PDF: `/api/agreement/[id]/pdf` atau tombol Download di profil
- Seed: `PartnershipAgreement` v1.0 aktif + semua engineer dummy SIGNED

*Dokumen ini bukan opini hukum formal. Konsultasikan dengan kuasa hukum untuk audit resmi.*
