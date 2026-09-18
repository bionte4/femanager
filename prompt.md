
### PROMPT 0 - INIT PROJECT*

Buat project baru sesuai.cursorrules postgres native.

1. Buat docker-compose.yml dengan service: postgres:15 postgis, pgadmin, dan minio
2. Buat file.env.example dan.env dengan DATABASE_URL postgresql://postgres:password@localhost:5432/fetrack
3. Buat prisma/schema.prisma lengkap dengan semua model: User, Tenant, Device, SlaConfig, Ticket, TicketLog, Sparepart, dan semua Enum. Tambahkan field lat/lng Float untuk geo.
4. Buat file prisma/migrations/enable_postgis/migration.sql isinya CREATE EXTENSION postgis dan pg_trgm
5. Buat lib/prisma.ts singleton
6. Install semua dependency: prisma, @prisma/client, next-auth, bcryptjs, sharp, localforage, mapbox-gl
7. Buat prisma/seed.ts untuk seed 3 SLA tier, 5 User dummy (1 admin, 4 engineer dengan lat/lng berbeda di Jabodetabek), 20 Tenant dummy se-Jabodetabek dengan lat/lng real
8. Jangan lanjut sampai docker-compose up dan npx prisma migrate dev & seed berhasil.

#### PROMPT 1 - AUTH & LAYOUT*

Setup Auth & Layout.

1. Setup NextAuth v5 di lib/auth.ts dengan CredentialsProvider (login pakai phone + password, hash pakai bcryptjs)
2. Buat middleware.ts untuk protect route: /admin/* hanya untuk SUPER_ADMIN, ADMIN_NOC, DISPATCHER. /engineer/* hanya untuk FIELD_ENGINEER.
3. Buat layout untuk (admin) dengan Sidebar shadcn: menu Dashboard, Peta, Tenants, Devices, Engineers, Tickets, Reports
4. Buat layout untuk (engineer) dengan bottom navigation mobile-first: Ticket Saya, History, Profil
5. Buat halaman /login yang keren, mobile responsive

#### PROMPT 2 - MASTER DATA CRUD*

Buat modul Master Data.

1. Buat CRUD Tenant di /admin/tenants: tabel dengan search, filter kota, pagination. Form tambah tenant wajib ada map picker Mapbox untuk pilih lat/lng, auto fill province/city/district via reverse geocode Mapbox.
2. Buat CRUD Device di /admin/devices: linked ke tenant
3. Buat CRUD Engineer di /admin/engineers: form tambah engineer ada multi-select skills EDC/LAN/WAN, dan map picker untuk home base lat/lng. Tampilkan status available/busy
4. Semua CRUD pakai Server Actions di app/actions/ dan pakai React Hook Form + Zod
5. Buat component SlaConfig di /admin/settings untuk atur response_time & resolution_time per tier

#### PROMPT 3 - TICKETING CORE*

Buat core Ticketing System.

1. Buat API POST /api/tickets untuk create ticket manual dan via webhook monitoring. Auto generate ticket_no format FE-YYYYMMDD-XXXX. Auto hitung sla_due_at berdasarkan sla_tier tenant + sla_configs.
2. Buat halaman /admin/tickets dengan tabel realtime (polling 15 detik pakai TanStack Query). Kolom: ticket_no, tenant, device, priority, status dengan badge warna, engineer assigned, SLACountdown component, action.
3. Buat halaman detail /admin/tickets/[id] yang menampilkan timeline TicketLog, info tenant + device, dan tombol Assign Engineer manual
4. Buat Server Action untuk update status ticket dan selalu insert ke TicketLog

#### PROMPT 4 - AUTO DISPATCH ENGINE (JANTUNG APLIKASI)*

Buat Auto Dispatch Engine - ini fitur paling penting.

1. Buat file lib/dispatch.ts dengan function autoDispatchTicket(ticketId). Logikanya:
 - Ambil tenant lat/lng dari ticket
 - Query pakai prisma.$queryRaw untuk cari 5 engineer terdekat pakai ST_Distance + filter status=AVAILABLE dan skills cocok
 - Assign ke engineer #1, update ticket status ke ASSIGNED
 - Panggil lib/whatsapp.ts untuk kirim WA ke engineer
2. Buat lib/haversine.ts untuk fallback hitung jarak jika postgis gagal
3. Buat lib/whatsapp.ts untuk hit API Fonnte (template: "Ada ticket baru {ticket_no} di {tenant_name}. Segera Accept di app")
4. Buat API /api/cron/check-dispatch yang akan di-hit tiap 1 menit: cek semua ticket ASSIGNED yang sudah >10 menit tidak di-accept, auto re-assign ke engineer terdekat #2 dan update jadi ESCALATED jika sudah 3x
5. Integrasikan autoDispatch ke POST /api/tickets (jadi setiap ticket baru langsung auto dispatch)

#### PROMPT 5 - PETA MONITORING REALTIME*

Buat halaman Peta Monitoring.

1. Buat halaman /admin/map full screen Mapbox
2. Tampilkan semua tenant sebagai marker cluster: hijau jika semua device UP, merah jika ada device DOWN, kuning jika ada ticket OPEN/ASSIGNED di tenant itu
3. Tampilkan posisi engineer (User dengan lat/lng) sebagai marker biru dengan popup nama & status
4. Klik marker tenant -> popup detail + tombol Buat Ticket + List device
5. Ada filter di atas peta: filter by Kota, filter by Status, filter by SLA Tier
6. Buat juga widget KPI Cards di atas peta: Total Tenant, Total Down, Ticket Overdue, SLA % hari ini

#### PROMPT 6 - MOBILE PWA FIELD ENGINEER*

Buat aplikasi Field Engineer (PWA Mobile-First).

1. Buat halaman /engineer/my-tickets: list ticket yang assigned ke engineer login. Card design besar, menampilkan SLACountdown yang jelas, alamat tenant + tombol Buka di Google Maps
2. Buat halaman detail /engineer/tickets/[id] dengan flow tombol wajib urut:
 - Tombol ON_THE_WAY -> update lokasi engineer saat itu
 - Tombol ON_SITE -> WAJIB validasi GPS, hit API POST /api/tickets/checkin yang cek jarak <100m dari tenant. Jika gagal, tampilkan error "Kamu belum di lokasi, jarak {x} meter"
 - Tombol IN_PROGRESS -> form checklist PM/CM (dinamis sesuai tipe device)
 - Tombol RESOLVED -> WAJIB upload foto Before/After via /api/upload, wajib isi notes perbaikan, test ping/LAN
 - Tombol ESCALATE -> form alasan + butuh sparepart apa
3. Buat hook useOfflineSync dengan localforage: semua action saat offline disimpan dulu, ada badge "Menunggu Sync", begitu online auto sync ke server
4. Buat PWA installable: buat manifest.json dan service worker simple
5. UI harus super simple, tombol besar, font besar, cocok untuk SMK di lapangan

#### PROMPT 7 - UPLOAD & LOG TIMELINE*

Buat fitur Upload & Timeline.

1. Sempurnakan app/api/upload/route.ts: pakai sharp untuk compress image max 800px, quality 70%, simpan ke /public/uploads/tickets/{ticketId}/, buat folder jika belum ada. Return {url, filename}. Validasi hanya image/jpeg/png max 5MB
2. Di halaman detail ticket (admin & engineer) tampilkan timeline TicketLog yang cantik seperti tracking paket: icon status, jam, siapa yang ubah, notes, foto thumbnail yang bisa di-klik zoom, dan peta kecil lat/lng saat log dibuat
3. Buat component PhotoGallery untuk Before/After

#### PROMPT 8 - REPORT & SLA DASHBOARD*

Buat Dashboard & Report SLA.

1. Buat /admin/dashboard dengan:
 - 4 KPI Cards: SLA Achievement % bulan ini, MTTR (Mean Time To Resolve), Total Ticket, Ticket Overdue
 - Grafik batang: Ticket per hari (7 hari terakhir) pakai Recharts
 - Grafik pie: Status ticket
 - Tabel Top 5 Engineer dengan rating & jumlah ticket closed tercepat
 - Tabel Ticket Overdue yang butuh perhatian
2. Buat /admin/reports: filter by tanggal, kota, engineer, tier. Tombol Export Excel (pakai xlsx lib) untuk laporan ke klien. Kolom export: ticket_no, tenant, engineer, open_at, resolved_at, durasi, sla_status (meet/breach)
3. Buat function lib/sla.ts untuk hitung SLA Meet: (total closed ontime / total closed) * 100%

#### PROMPT 9 - POLISH & DEPLOY READY*

Final Polish.

1. Buat halaman /admin/engineers/[id] untuk lihat performance engineer: jumlah ticket, MTTR, SLA meet rate, history foto pekerjaan
2. Tambahkan fitur Inventory Sparepart simple: /admin/spareparts untuk catat stok EDC, router di gudang & di engineer. Saat engineer escalate pending_sparepart, bisa pilih sparepart
3. Buat seed data lebih real: 100 tenant se-Indonesia (Jakarta, Bandung, Surabaya, Medan, Makassar, sampai kecamatan di Jawa), 30 engineer tersebar
4. Optimasi: tambahkan loading skeleton di semua tabel, empty state yang bagus, dan toast notification untuk semua action
5. Buatkan README.md lengkap cara run: docker-compose up -d, npm install, npx prisma migrate dev, npx prisma db seed, npm run dev, dan cara setup cron tiap 1 menit hit /api/cron/check-dispatch


### PROMPT 10 - MODUL INTEGRASI CUSTOMER* yang lengkap. Copy paste aja ke Cursor Agent.

Ini udah include Prisma + API + Webhook + Halaman Admin + Dokumentasi.

---


Buat Modul Integrasi Customer (Open API & Webhook) - Ini PROMPT 10.

KONTEKS: Salah satu customer punya aplikasi ITSM sendiri (misal GLPI/ServiceNow). Mereka mau push ticket ke kita, dan kita harus push balik status + foto. FE kita tetap kerja di app kita, tapi customer bisa lihat progress di app mereka.

KERJAKAN URUTAN INI:

### 1. UPDATE PRISMA SCHEMA
Tambahkan 2 model baru di prisma/schema.prisma:

model Integration {
 id String @id @default(cuid())
 customer_name String // ex: "Bank BRI", "Alfamart"
 api_key String @unique // generate random 32 char, simpan plain di awal lalu hash
 api_key_hash String // hashed pakai bcrypt
 webhook_url String? // URL webhook customer untuk kita push balik, ex: https://customer.com/api/webhook/fetrack
 webhook_secret String? // untuk sign payload
 is_active Boolean @default(true)
 created_at DateTime @default(now())
 external_tickets ExternalTicket[]
}

model ExternalTicket {
 id String @id @default(cuid())
 integration_id String
 integration Integration @relation(fields: [integration_id], references: [id])
 external_ticket_id String // ID ticket dari sisi customer, ex: "INC12345"
 internal_ticket_id String @unique
 internal_ticket Ticket @relation(fields: [internal_ticket_id], references: [id])
 last_payload Json? // simpan payload terakhir dari customer
 last_response Json? // simpan response terakhir yang kita kirim ke customer
 created_at DateTime @default(now())
 @@unique([integration_id, external_ticket_id])
}

// Tambahkan relasi di model Ticket:
model Ticket {
 //... field lama tetap
 external_ticket ExternalTicket?
}

Setelah itu jalankan npx prisma migrate dev --name add_integration_module dan generate.

### 2. BUAT LIBRARIES
Buat file lib/apiKey.ts:
- function generateApiKey(): string -> generate 32 char nanoid
- function hashApiKey(key): hash dengan bcrypt
- function validateApiKey(plain, hash): boolean

Buat file lib/webhook.ts:
- function signPayload(payload, secret): HMAC SHA256
- function sendToCustomer(integration: Integration, event: string, ticket: Ticket dengan include Tenant, Device, Engineer, logs)
- Payload yang dikirim harus standar:
{
 event: "ticket.assigned" | "ticket.on_the_way" | "ticket.on_site" | "ticket.resolved" | "ticket.closed",
 timestamp: ISO,
 data: {
 external_ticket_id: string,
 internal_ticket_no: string,
 status: string,
 tenant_code: string,
 engineer: { name, phone },
 notes: string,
 photos: string[] (url full),
 lat, lng,
 resolved_at
 }
}
- Implement retry 3x dengan delay 5s, 30s, 60s. Jika gagal semua, simpan di log dan jangan crash.
- Log setiap webhook send ke console dan simpan last_response di ExternalTicket

Buat file lib/integrationAuth.ts:
- Middleware untuk validasi header X-API-KEY di API external. Cari Integration dimana api_key_hash cocok dan is_active=true. Return integration object atau throw 401.

### 3. BUAT OPEN API UNTUK CUSTOMER (API KEY AUTH)
Buat folder app/api/v1/external/tickets

a) POST /api/v1/external/tickets/route.ts
- Auth pakai X-API-KEY via lib/integrationAuth.ts
- Body Zod schema: { external_ticket_id: string (required, unique per customer), tenant_code: string (required), device_serial: string?, type: enum INCIDENT/PM/CM default INCIDENT, priority: enum low/medium/high/critical default medium, description: string, reported_by: string? }
- Logic:
 1. Cari tenant by code, jika tidak ada return 404 "Tenant code not found"
 2. Cari device by serial jika ada
 3. Cek apakah external_ticket_id sudah pernah ada untuk integration ini, jika ada return 409
 4. Buat Ticket baru dengan status OPEN, generate ticket_no FE-xxx, hitung sla_due_at
 5. Buat ExternalTicket mapping
 6. Langsung panggil autoDispatchTicket(newTicket.id) dari lib/dispatch.ts
 7. Return 201 { success: true, internal_ticket_no, internal_ticket_id, sla_due_at, assigned_engineer }

b) GET /api/v1/external/tickets/[externalId]/route.ts
- Auth X-API-KEY
- Return detail ticket internal + timeline logs + photos

c) PATCH /api/v1/external/tickets/[externalId]/route.ts
- Auth X-API-KEY
- Body: { status: "closed" | "cancelled", notes: string? }
- Hanya boleh close/cancel dari sisi customer. Update Ticket internal jadi CLOSED jika dari customer bilang closed.

### 4. BUAT WEBHOOK TRIGGER (PUSH BALIK KE CUSTOMER)
Edit file app/actions/tickets.ts (atau dimana kamu update status ticket):
- Setiap kali TicketLog berhasil dibuat (status berubah), cek apakah ticket punya relasi external_ticket. Jika ada:
- Ambil Integration nya
- Panggil sendToCustomer() secara async (jangan await blocking, pakai after() atau background) dengan event ticket.{new_status}
- Update ExternalTicket.last_response

Pastikan event yang di-trigger: assigned, on_the_way, on_site, in_progress, resolved, closed, escalated

### 5. BUAT HALAMAN ADMIN INTEGRASI
Buat halaman /admin/integrations

- Tabel list Integration: customer_name, api_key (tampilkan hanya 4 char terakhir, ada tombol Show/Copy full key sekali saja saat create), webhook_url, is_active, jumlah external_tickets, last used
- Tombol Create Integration: form customer_name, webhook_url (optional), webhook_secret. Saat submit, generate api_key, tampilkan modal "COPY API KEY INI SEKARANG, tidak akan tampil lagi" dengan contoh curl
- Di detail /admin/integrations/[id]:
 - Info API Key & Webhook
 - Tombol Test Webhook: kirim dummy payload ke webhook_url customer dan tampilkan response
 - Tabel ExternalTicket mapping: external_id <-> internal_ticket_no, status, created_at, last_response status (success/failed)
 - Tombol Re-send webhook untuk yang failed
- Buat halaman /admin/integrations/docs yang menampilkan dokumentasi API simple dengan contoh curl untuk POST, GET, PATCH dan contoh payload webhook yang akan mereka terima

### 6. BUAT CONTOH CURL & DOKUMENTASI
Di /admin/integrations/docs tampilkan:

Judul: "Dokumentasi API untuk Customer"
- Base URL: {NEXTAUTH_URL}/api/v1/external
- Auth: Header X-API-KEY: <api_key>
- Endpoint 1: POST /tickets
- Endpoint 2: GET /tickets/:externalId
- Endpoint 3: PATCH /tickets/:externalId
- Format Webhook yang akan kami kirim ke URL customer (lengkap dengan contoh JSON dan cara validasi signature X-Webhook-Signature)

### 7. SEED & TESTING
- Update prisma/seed.ts: buat 1 Integration dummy customer_name="Customer Demo", api_key="demo123", webhook_url="https://webhook.site/xxx"
- Buat file testing INTEGRATION_TESTING.md di root yang berisi langkah test integrasi pakai curl dan webhook.site

PENTING:
- Semua API external harus ada rate limit simple (pakai in-memory, max 60 req/min per api_key)
- Jangan pernah log api_key plain di console
- Pastikan CORS allow untuk API external
- Code harus TypeScript, pakai Zod validasi, dan handle error dengan baik

JANGAN SELESAI SAMPAI HALAMAN /admin/integrations BISA CREATE API KEY, TEST WEBHOOK, DAN API POST /api/v1/external/tickets BISA DICOBA PAKAI CURL DAN BERHASIL AUTO DISPATCH KE ENGINEER.

---

*Setelah paste prompt ini, test nya gini di terminal:*

curl -X POST http://localhost:3000/api/v1/external/tickets \
-H "X-API-KEY: api_key_customer_demo" \
-H "Content-Type: application/json" \
-d '{
 "external_ticket_id": "INC-BRI-001",
 "tenant_code": "BRI-JKT-001",
 "description": "EDC tidak bisa print",
 "priority": "high"
}'

Kalau berhasil, ticket langsung masuk ke `/admin/tickets` dan auto ke-dispatch ke engineer terdekat.




### PROMPT 11 - MODUL KOMISI & PAYROLL ENGINEER FREELANCE*

Ini yang bikin bisnis kamu auto-pilot. Engineer freelance dibayar per ticket, ada denda kalau SLA breach, ada bonus kalau cepat.

Buat Modul Komisi, Payroll & Wallet Engineer Freelance - Ini PROMPT 11.

KONTEKS: Engineer kita adalah SMK/S1 freelance dibayar per ticket closed, bukan gaji bulanan. Harus ada sistem komisi otomatis, potongan denda SLA breach, bonus on-time, dan wallet untuk tarik saldo. Ini kunci agar SLA MEET.

KERJAKAN URUTAN INI:

### 1. UPDATE PRISMA SCHEMA
Tambahkan model-model ini di prisma/schema.prisma:

model CommissionRule {
 id String @id @default(cuid())
 name String // ex: "EDC Jabodetabek", "LAN Luar Jawa"
 device_type String? // EDC_BCA, ROUTER, etc. null = semua
 sla_tier SlaTier? // TIER1_JABODETABEK, TIER2_PROVINCE, TIER3_KABUPATEN, null = semua
 ticket_type TicketType // INCIDENT, PM, CM
 base_fee Int // dalam rupiah, ex: 75000 = 75rb per ticket
 bonus_ontime_fee Int @default(0) // bonus jika resolved sebelum 50% SLA time, ex: 15000
 penalty_breach_fee Int @default(0) // denda jika breach SLA, ex: -25000
 is_active Boolean @default(true)
 created_at DateTime @default(now())
}

model EngineerWallet {
 id String @id @default(cuid())
 engineer_id String @unique
 engineer User @relation(fields: [engineer_id], references: [id])
 balance Int @default(0) // saldo saat ini dalam rupiah
 total_earned Int @default(0)
 total_withdrawn Int @default(0)
 total_penalty Int @default(0)
 updated_at DateTime @updatedAt
}

model WalletTransaction {
 id String @id @default(cuid())
 wallet_id String
 wallet EngineerWallet @relation(fields: [wallet_id], references: [id])
 ticket_id String?
 ticket Ticket? @relation(fields: [ticket_id], references: [id])
 type TransactionType // EARN, BONUS, PENALTY, WITHDRAW, ADJUSTMENT
 amount Int // positif untuk earn/bonus, negatif untuk penalty/withdraw
 description String // ex: "Fee ticket FE-20250101-0001", "Bonus ontime <50% SLA", "Denda breach SLA"
 created_at DateTime @default(now())
 created_by String? // admin yang approve adjustment
}

model Withdrawal {
 id String @id @default(cuid())
 engineer_id String
 engineer User @relation(fields: [engineer_id], references: [id])
 amount Int
 bank_name String
 bank_account_no String
 bank_account_name String
 status WithdrawalStatus // PENDING, APPROVED, REJECTED, PAID
 requested_at DateTime @default(now())
 processed_at DateTime?
 processed_by String? // admin id
 notes String?
}

Enum baru:
enum TransactionType { EARN, BONUS, PENALTY, WITHDRAW, ADJUSTMENT }
enum WithdrawalStatus { PENDING, APPROVED, REJECTED, PAID }

Update model Ticket:
- tambahkan commission_calculated Boolean @default(false)
- tambahkan commission_amount Int? // total yang didapat engineer untuk ticket ini
- tambahkan relasi WalletTransaction[]

Update model User:
- tambahkan wallet EngineerWallet?
- tambahkan withdrawals Withdrawal[]

Setelah itu migrate: npx prisma migrate dev --name add_commission_wallet

### 2. BUAT LIB/COMMISSION.TS (OTAK HITUNG KOMISI)
Buat file lib/commission.ts dengan function utama:

- function calculateCommission(ticket: Ticket dengan include Tenant, Device): { base_fee, bonus, penalty, total }
 Logic:
 1. Cari CommissionRule yang paling spesifik: filter where is_active=true, cari yang device_type == ticket.device.type AND sla_tier == ticket.tenant.sla_tier AND ticket_type == ticket.type. Jika tidak ada, cari yang null (general rule).
 2. Ambil base_fee dari rule
 3. Hitung durasi: resolved_at - created_at
 4. Hitung SLA duration: sla_due_at - created_at
 5. Jika resolved_at <= sla_due_at:
 - Jika durasi <= 50% SLA duration => dapat bonus_ontime_fee
 - Jika tidak => hanya base_fee
 6. Jika resolved_at > sla_due_at => total = base_fee + penalty_breach_fee (penalty negatif)
 7. Return breakdown

- function processCommissionForTicket(ticketId: string)
 Logic:
 1. Cek ticket status harus RESOLVED/CLOSED dan commission_calculated=false
 2. Hitung pakai calculateCommission
 3. Cari wallet engineer, jika belum ada buat baru
 4. Buat WalletTransaction type EARN amount=base_fee, type BONUS jika ada, type PENALTY jika breach
 5. Update EngineerWallet.balance += total, total_earned += (base+bonus)
 6. Update Ticket commission_amount=total, commission_calculated=true
 7. Harus pakai prisma.$transaction agar atomic

### 3. INTEGRASI OTOMATIS KE FLOW TICKET
Edit app/actions/tickets.ts atau API yang update status ke RESOLVED/CLOSED:
- Setelah status jadi RESOLVED, panggil processCommissionForTicket(ticketId) secara async (pakai after() atau tidak blocking UI)
- Pastikan hanya diproses sekali (cek commission_calculated)

### 4. HALAMAN ADMIN - SETTING KOMISI
Buat /admin/settings/commissions

- Tabel CommissionRule: name, device_type, sla_tier, ticket_type, base_fee, bonus, penalty, is_active, action edit/delete
- Form Create/Edit: semua field dengan input rupiah (pakai format 75.000)
- Info box: "Rule paling spesifik akan dipakai dulu. Jika tidak ada yang cocok, pakai rule general (device_type & sla_tier kosong)"
- Seed default rules di prisma/seed.ts:
 - EDC TIER1 INCIDENT base 75000 bonus 15000 penalty -25000
 - EDC TIER2 INCIDENT base 100000 bonus 15000 penalty -25000
 - EDC TIER3 INCIDENT base 150000 bonus 25000 penalty -25000
 - LAN/WAN TIER1 base 100000, TIER2 125000, TIER3 175000
 - PM (Preventive Maintenance) semua tier base 50000

### 5. HALAMAN ADMIN - PAYROLL & WITHDRAWAL
Buat /admin/payroll

- KPI Cards: Total Saldo Engineer (semua wallet), Total Komisi Bulan Ini, Total Pending Withdrawal, Total Denda Bulan Ini
- Tab 1: Wallet Engineer - tabel semua engineer dengan balance, total_earned, total_penalty, total_withdrawn, jumlah ticket bulan ini, MTTR, action Lihat Transaksi
- Tab 2: Transaksi - tabel semua WalletTransaction dengan filter tanggal, engineer, type, search ticket_no
- Tab 3: Withdrawal Request - tabel request PENDING. Ada tombol Approve/Reject. Saat Approve, ubah status jadi APPROVED. Ada tombol Mark as PAID setelah transfer manual. Saat PAID, buat transaksi WITHDRAW dan kurangi balance.
- Tab 4: Laporan Payroll - filter bulan, export Excel: engineer_name, jumlah_ticket_closed, total_fee, total_bonus, total_penalty, total_dibayar, MTTR, SLA meet rate

### 6. HALAMAN ENGINEER - WALLET SAYA
Buat /engineer/wallet (di bottom nav tambah menu Wallet)

- Card besar Saldo Saat Ini: Rp xxx.xxx dengan tombol Tarik Saldo
- 3 Card kecil: Total Dicairkan, Total Bonus, Total Denda
- List Transaksi: timeline seperti mutasi bank, icon beda untuk EARN (hijau), BONUS (biru), PENALTY (merah), WITHDRAW (abu). Tampilkan ticket_no, tanggal, amount
- Tombol Tarik Saldo -> modal form: amount (max balance), bank_name dropdown (BCA, BRI, Mandiri, BNI, DANA, OVO, GoPay), bank_account_no, bank_account_name. Validasi min withdrawal 50rb. Submit jadi status PENDING.
- Halaman /engineer/withdrawals untuk lihat history penarikan: status dengan badge warna PENDING kuning, APPROVED biru, PAID hijau, REJECTED merah
- Tampilkan motivasi: "Selesaikan 3 ticket lagi sebelum 50% SLA untuk dapat bonus Rp 15.000!"

### 7. NOTIFIKASI KOMISI
- Saat komisi diproses, kirim WA ke engineer via lib/whatsapp.ts: "Selamat! Komisi Rp {total} untuk ticket {ticket_no} sudah masuk wallet. Saldo sekarang Rp {balance}. {bonus? 'Dapat bonus ontime!': ''}"
- Saat withdrawal di-approve/paid, kirim WA notif

### 8. SECURITY & VALIDASI
- Engineer hanya bisa lihat wallet miliknya sendiri (cek engineer_id == session.user.id)
- Admin bisa lihat semua wallet tapi tidak bisa edit balance manual kecuali via ADJUSTMENT transaction dengan notes wajib
- Semua transaksi rupiah pakai Int (bukan Float) untuk hindari floating error
- Buat API /api/engineer/wallet untuk get balance & transactions (auth engineer only)

JANGAN SELESAI SAMPAI:
1. CommissionRule bisa di-CRUD di admin
2. Saat ticket diubah jadi RESOLVED, wallet engineer otomatis bertambah
3. Engineer bisa lihat saldo di /engineer/wallet dan request withdrawal
4. Admin bisa approve withdrawal di /admin/payroll dan saldo terpotong
5. Export Excel payroll berfungsi

Buat UI nya clean, pakai format rupiah Indonesia Rp 75.000, dan warna hijau untuk uang masuk, merah untuk denda.

---




## PROMPT 12 - LEADERBOARD & ANTI-FRAUD SYSTEM*

Ini yang paling penting biar FE freelance kamu jujur. Banyak FE nakal: fake GPS, foto dari Google, check-in dari warung padahal belum ke toko.

*COPY DARI SINI:*

Buat Modul Leaderboard, Rating & Anti-Fraud System - Ini PROMPT 12 FINAL.

KONTEKS: Engineer freelance rawan nakal. Kita harus punya sistem yang otomatis deteksi kecurangan dan kasih reward ke yang jujur. Ini kunci SLA Meet yang real, bukan palsu.

KERJAKAN URUTAN INI:

### 1. UPDATE PRISMA SCHEMA
Tambahkan model-model ini:

model EngineerRating {
 id String @id @default(cuid())
 engineer_id String
 engineer User @relation(fields: [engineer_id], references: [id])
 ticket_id String @unique
 ticket Ticket @relation(fields: [ticket_id], references: [id])
 tenant_rating Int? // rating dari toko 1-5, optional
 tenant_comment String?
 system_score Float // score otomatis dari sistem 0-100
 fraud_flags String[] // array flag: ["FAKE_GPS", "PHOTO_REUSE", "FAST_RESOLVE"]
 is_fraud Boolean @default(false)
 created_at DateTime @default(now())
}

model FraudLog {
 id String @id @default(cuid())
 engineer_id String
 engineer User @relation(fields: [engineer_id], references: [id])
 ticket_id String
 ticket Ticket @relation(fields: [ticket_id], references: [id])
 type FraudType // FAKE_GPS, PHOTO_DUPLICATE, FAST_CHECKIN, LOCATION_JUMP, PHOTO_GPS_MISMATCH
 severity FraudSeverity // LOW, MEDIUM, HIGH
 description String // ex: "Checkin jarak 500m tapi foto EXIF GPS beda 2km"
 metadata Json? // simpan data bukti: {claimed_lat, claimed_lng, exif_lat, exif_lng, distance_meter, photo_hash}
 is_resolved Boolean @default(false)
 created_at DateTime @default(now())
}

model LeaderboardSnapshot {
 id String @id @default(cuid())
 period String // ex: "2025-01", "2025-W02", "all_time"
 engineer_id String
 engineer User @relation(fields: [engineer_id], references: [id])
 total_tickets Int
 sla_meet_rate Float // 0-100
 avg_resolve_minutes Float
 total_earnings Int
 fraud_count Int
 score Float // total score gabungan
 rank Int
 created_at DateTime @default(now())
 @@unique([period, engineer_id])
}

Enum:
enum FraudType { FAKE_GPS, PHOTO_DUPLICATE, FAST_CHECKIN, LOCATION_JUMP, PHOTO_GPS_MISMATCH, TIME_ANOMALY }
enum FraudSeverity { LOW, MEDIUM, HIGH }

Update User:
- tambahkan ratings EngineerRating[]
- tambahkan fraud_logs FraudLog[]
- tambahkan leaderboard LeaderboardSnapshot[]
- tambahkan field: is_suspended Boolean @default(false), suspended_reason String?, trust_score Float @default(100.0) // 0-100

Update Ticket:
- tambahkan rating EngineerRating?

### 2. BUAT LIB/ANTI-FRAUD.TS (OTAK DETEKSI CURANG)
Buat file lib/antifraud.ts dengan fungsi-fungsi ini:

a) function checkFakeGPS(ticketLog: {lat, lng, photo_url}): Promise<FraudLog?>
- Saat engineer upload foto, baca EXIF GPS dari foto pakai lib exif (pakai exif-reader atau sharp metadata)
- Bandingkan EXIF lat/lng foto vs lat/lng checkin yang dikirim FE
- Jika jarak > 500 meter => flag PHOTO_GPS_MISMATCH HIGH severity
- Jika foto tidak ada EXIF GPS sama sekali => flag LOW (mungkin HP setting GPS off) tapi tetap catat
- Jika lat/lng checkin = 0,0 atau sama persis dengan ticket sebelumnya dalam 5 menit tapi tenant beda jauh => flag LOCATION_JUMP HIGH

b) function checkPhotoDuplicate(photoBuffer, engineer_id): Promise<FraudLog?>
- Hitung hash foto pakai SHA256 atau perceptual hash (pakai sharp + simple hash)
- Cek di database: apakah hash foto ini pernah dipakai engineer ini di ticket lain dalam 30 hari terakhir?
- Jika ya => flag PHOTO_DUPLICATE HIGH - foto comot dari ticket lama / Google

c) function checkFastCheckin(ticket): Promise<FraudLog?>
- Hitung durasi: ON_SITE -> RESOLVED
- Jika ticket INCIDENT EDC tapi durasi < 5 menit => flag FAST_CHECKIN MEDIUM (tidak mungkin perbaiki EDC secepat itu)
- Jika ON_THE_WAY -> ON_SITE jarak tenant 20km tapi waktu tempuh < 5 menit => flag TIME_ANOMALY HIGH (fake GPS)

d) function calculateSystemScore(ticket, fraudLogs): number 0-100
- Base 100
- -20 jika ada HIGH fraud
- -10 jika MEDIUM
- -5 jika LOW
- -15 jika SLA breach
- +10 jika ada foto before/after lengkap + notes > 20 karakter
- +5 jika resolve < 50% SLA

e) function runAntiFraudCheck(ticketId): Promise<{is_fraud, score, flags}>
- Panggil semua check di atas saat ticket mau RESOLVED
- Buat FraudLog jika ada pelanggaran
- Buat EngineerRating dengan system_score dan fraud_flags
- Jika HIGH fraud >=2 dalam 7 hari, auto set User.is_suspended=true dan kirim notif ke admin
- Return hasil

### 3. INTEGRASI KE FLOW TICKET
Edit lib/commission.ts dan app/actions/tickets.ts:
- Saat ticket akan RESOLVED, panggil dulu runAntiFraudCheck(ticketId)
- Jika is_fraud=true dan ada HIGH severity: JANGAN langsung kasih komisi. Set ticket status jadi PENDING_REVIEW dan kirim notif ke admin untuk review manual. Komisi ditahan.
- Jika tidak fraud, lanjutkan processCommissionForTicket seperti biasa
- Update User.trust_score = average system_score dari 10 ticket terakhir

### 4. HALAMAN ADMIN - ANTI FRAUD CENTER
Buat halaman /admin/fraud-center

- KPI Cards: Total Flag Hari Ini, Engineer Suspended, Photo Duplicate Terdeteksi, Avg Trust Score
- Tab 1: Fraud Logs - tabel semua FraudLog dengan filter severity, type, tanggal. Kolom: engineer, ticket_no, type dengan badge merah, description, metadata (tampilkan peta perbandingan lat/lng claimed vs exif), status resolved. Action: Approve (bukan fraud) / Confirm Fraud (tahan komisi + suspend)
- Tab 2: Pending Review - list ticket yang status PENDING_REVIEW karena anti-fraud. Admin bisa lihat foto, peta GPS, timeline. Tombol: Approve & Bayar Komisi / Reject & Suspend Engineer
- Tab 3: Engineer Trust - tabel semua engineer dengan trust_score (progress bar warna hijau >80, kuning 50-80, merah <50), jumlah fraud HIGH/MEDIUM/LOW, status suspended. Action: Reset Trust, Suspend/Unsuspend
- Di detail ticket /admin/tickets/[id] tambahkan section Anti-Fraud: tampilkan fraud flags jika ada, dan peta yang menunjukkan 2 titik: lokasi checkin vs lokasi EXIF foto

### 5. HALAMAN LEADERBOARD
Buat halaman /admin/leaderboard dan /engineer/leaderboard

a) /admin/leaderboard:
- Filter period: Hari Ini, Minggu Ini, Bulan Ini, All Time
- Tabel ranking: rank #1 #2 #3 dengan crown emoji, engineer name, total tickets, SLA meet rate %, avg resolve time, total earnings, trust_score, score total
- Score formula: (SLA meet rate * 0.4) + ( (1000/avg_resolve) * 0.3 ) + (trust_score * 0.3) - (fraud_count*10)
- Tombol Recalculate Leaderboard yang hit API /api/leaderboard/recalculate
- Export leaderboard Excel

b) /engineer/leaderboard:
- Tampilkan rank engineer yang login: "Kamu Ranking #5 Bulan Ini!"
- Tampilkan top 10
- Tampilkan progress: "Selesaikan 2 ticket ontime lagi untuk naik ke Rank #4 dan dapat bonus extra Rp 50.000"
- Motivasi gamification

### 6. BUAT API & CRON
- Buat API POST /api/fraud/check/:ticketId untuk trigger manual check (admin only)
- Buat API POST /api/leaderboard/recalculate yang hitung LeaderboardSnapshot untuk period bulan ini dan all_time. Simpan ke tabel.
- Buat API GET /api/leaderboard?period=2025-01 untuk get ranking
- Buat lib/exif.ts untuk baca EXIF GPS dari foto: pakai exifr atau sharp metadata, return {lat, lng, timestamp}

### 7. UPDATE UPLOAD API UNTUK EXIF
Edit app/api/upload/route.ts:
- Setelah compress pakai sharp, baca EXIF GPS sebelum di-strip. Simpan EXIF data di metadata return
- Simpan juga hash SHA256 foto untuk cek duplicate nanti. Simpan hash di TicketLog metadata atau buat kolom baru photo_hash di TicketLog

Update TicketLog model tambahkan:
- photo_hash String?
- exif_lat Float?
- exif_lng Float?
- exif_timestamp DateTime?

### 8. SEED & TESTING FRAUD
- Update seed: buat 2-3 FraudLog dummy untuk testing
- Buat file FRAUD_TESTING.md cara test fake GPS: upload foto tanpa EXIF, upload foto yang sama 2x, etc.

DEPENDENCIES TAMBAHAN:
- npm install exifr (untuk baca EXIF GPS)
- npm install jimp atau tetap sharp untuk hash

PENTING:
- Jangan blokir engineer langsung untuk LOW severity, hanya catat dan kurangi trust_score
- HIGH severity 2x dalam seminggu = auto suspend + tahan komisi
- Semua deteksi harus ada bukti visual di admin (peta perbandingan, foto duplicate side-by-side)
- Leaderboard harus realtime update setiap ticket resolved

JANGAN SELESAI SAMPAI:
1. Upload foto tanpa GPS terdeteksi sebagai fraud LOW
2. Upload foto yang sama di 2 ticket berbeda terdeteksi PHOTO_DUPLICATE
3. Checkin fake GPS jauh dari tenant tapi foto EXIF beda lokasi terdeteksi
4. Leaderboard bisa di-recalculate dan tampil di /admin/leaderboard dan /engineer/leaderboard
5. Ticket dengan HIGH fraud masuk ke PENDING_REVIEW dan komisinya tidak langsung cair

---

### PROMPT 13 - MODUL RECRUITMENT & RESOURCE HUNTER* - tinggal paste ke Cursor:


Buat Modul Recruitment & Resource Management - Ini PROMPT 13.

KONTEKS: Kita butuh fitur untuk cari, seleksi, dan onboarding FE freelance langsung dari dalam aplikasi FE-Track. Biar admin bisa rekrut se-Indonesia tanpa Google Form lagi.

KERJAKAN URUTAN INI:

### 1. UPDATE PRISMA SCHEMA
Tambahkan model ini:

model EngineerCandidate {
 id String @id @default(cuid())
 full_name String
 phone String @unique
 whatsapp String
 email String?
 nik String? // KTP
 address String
 province String
 city String
 district String
 lat Float?
 lng Float?
 education String // SMK_TKJ, D3_TI, S1_TI, SMA, etc
 school_name String? // ex: SMK N 1 Jakarta
 has_motorcycle Boolean @default(false)
 has_toolkit Boolean @default(false)
 has_laptop Boolean @default(false)
 skills String[] // ["EDC", "LAN", "WAN", "CCTV", "PC"]
 experience_years Int @default(0)
 previous_vendor String? // ex: "SSI", "Mitracomm"
 bank_name String?
 bank_account_no String?
 bank_account_name String?
 id_card_photo_url String? // foto KTP
 selfie_photo_url String? // foto selfie + KTP
 status CandidateStatus // NEW, SCREENING, TRAINING, TRIAL, APPROVED, REJECTED, BLACKLISTED
 screening_score Int? // 0-100 dari admin
 training_score Int? // hasil ujian
 trial_tickets_completed Int @default(0)
 trust_score_initial Float @default(100)
 assigned_coordinator_id String? // User id koordinator yang rekrut
 coordinator User? @relation("CoordinatorRecruits", fields: [assigned_coordinator_id], references: [id])
 notes String? // catatan admin
 rejection_reason String?
 created_at DateTime @default(now())
 updated_at DateTime @updatedAt
}

enum CandidateStatus { NEW, SCREENING, TRAINING, TRIAL, APPROVED, REJECTED, BLACKLISTED }

Update User model tambahkan:
- recruits EngineerCandidate[] @relation("CoordinatorRecruits")
- tambahkan field is_coordinator Boolean @default(false) // untuk FE Level 3 yang jadi korwil

### 2. BUAT LANDING PAGE PUBLIC UNTUK DAFTAR
Buat halaman public (tanpa login) di app/(public)/join

- Design landing page keren, mobile-first, untuk anak SMK:
 Hero: "Jadi Field Engineer Freelance, Cair 75-150rb Per Job di Sekitar Rumahmu!"
 Benefit: Kerja Flexible, Fee Mingguan, Training Gratis, Sertifikat, Jenjang Karir
 3 Langkah: Daftar -> Training Online 1 Jam -> Dapet Job
 Testimoni (dummy): 3 FE dengan foto dan penghasilan
 Tombol CTA besar: "Daftar Sekarang Gratis"
 FAQ: Apakah harus punya pengalaman? Daerah mana saja? Kapan cair?

- Buat form multi-step di /join/register (5 step):
 Step 1: Data Diri (nama, WA, alamat lengkap dengan map picker untuk lat/lng rumah)
 Step 2: Pendidikan & Kendaraan (sekolah, punya motor/toolkit/laptop)
 Step 3: Skill & Pengalaman (checkbox EDC/LAN/WAN/CCTV, tahun pengalaman, vendor sebelumnya)
 Step 4: Bank & Dokumen (upload KTP, selfie + KTP pakai /api/upload)
 Step 5: Review & Submit

- Saat submit, buat EngineerCandidate dengan status NEW
- Setelah submit, tampilkan halaman sukses: "Pendaftaran diterima! Kami akan hubungi via WA dalam 1x24 jam. Join grup WA recruitment: link"

- Buat API POST /api/candidates/register (public, no auth, tapi rate limit 5/hour per IP)

### 3. BUAT HALAMAN ADMIN - RESOURCE HUNTER
Buat halaman /admin/recruitment

- KPI Cards: Total Pendaftar Hari Ini, Menunggu Screening, Dalam Training, Trial, Approved Bulan Ini, Total FE Aktif
- PETA SEBARAN CANDIDATE: Tampilkan semua candidate di Mapbox dengan warna beda per status. Ini penting untuk lihat coverage area mana yang masih kosong. Filter by province/city/status
- Tabel Candidate dengan filter super lengkap:
 - Filter: status, province, city, education, has_motorcycle, skills, coordinator
 - Kolom: foto, nama, umur (dari NIK), kota, skill tags, status badge, screening_score, assigned coordinator, created_at, action
 - Search by nama/phone/kota
 - Bulk action: Assign ke Coordinator, Ubah Status, Export Excel

- Halaman Detail /admin/recruitment/[id]:
 - Tampilkan semua data candidate + foto KTP + peta rumahnya
 - Timeline status: NEW -> SCREENING -> TRAINING -> TRIAL -> APPROVED
 - Form Screening: admin isi screening_score (0-100) + notes, tombol Lolos Screening / Tolak
 - Form Training: input training_score, upload sertifikat training, tombol Lolos Training
 - Form Trial: lihat 3 ticket trial yang dikerjakan (link ke ticket), auto hitung trust_score, tombol Approve Jadi Engineer
 - Jika Approve: otomatis buat User baru dengan role FIELD_ENGINEER, phone & password default (phone terakhir 4 digit + 123), buatkan wallet EngineerWallet dengan balance 0, dan kirim WA "Selamat kamu lolos! Login pakai HP xxx & password xxx di app.fetrack.com/engineer"
 - Tombol Blacklist + alasan

### 4. BUAT HALAMAN KOORDINATOR
Buat halaman /coordinator/recruits (untuk User yang is_coordinator=true)

- Koordinator hanya bisa lihat candidate yang assigned ke dia + bisa tambah candidate baru via form
- Tabel recruits nya + tombol Tambah Manual (untuk koordinator yang rekrut offline di SMK)
- Komisi koordinator: setiap candidate yang di-rekrut dan APPROVED, koordinator dapat bonus Rp 25.000 masuk ke wallet nya (buat WalletTransaction type BONUS description "Bonus rekrut FE...")
- Dashboard koordinator: total recruits, approved, bonus earned

### 5. BUAT MODUL AUTO-SCREENING & SCORING
Buat file lib/candidateScoring.ts:

- function calculateScreeningScore(candidate): number 0-100
 Logic:
 +20 jika has_motorcycle
 +15 jika has_toolkit
 +10 jika education SMK_TKJ / D3_TI / S1_TI
 +10 jika experience_years >1
 +10 jika skills include EDC
 +10 jika alamat di kota besar / coverage kosong (cek di DB berapa FE di kota itu, jika <3 maka +15)
 +15 jika previous_vendor ada (sudah pengalaman)
 -50 jika tidak punya motor

- function findCoverageGap(): {city, province, needed_count, current_count}
 Query: group by city province hitung jumlah User FIELD_ENGINEER aktif vs jumlah Tenant di kota itu. Jika ratio Tenant:FE > 20:1, berarti butuh FE lagi di situ. Tampilkan di /admin/recruitment sebagai "Area Butuh FE Mendesak"

### 6. NOTIFIKASI & AUTOMATION
- Saat candidate daftar (NEW) -> kirim WA ke admin: "Ada pendaftar baru {nama} dari {kota}, skill {skills}"
- Saat candidate di-approve jadi engineer -> kirim WA ke candidate + WA ke koordinatornya dapat bonus
- Buat cron /api/cron/remind-candidates yang tiap hari cek candidate status SCREENING >2 hari belum diproses, kirim reminder ke admin

### 7. BONUS: PUBLIC API UNTUK JOB PORTAL
- Buat halaman /join/assets untuk download brosur PDF rekrutmen (bikin PDF simple pakai lib jsPDF: info benefit jadi FE)
- Buat link referral: /join?ref=KOORDINATOR_ID -> otomatis assigned_coordinator_id terisi. Jadi koordinator bisa share link referral sendiri

JANGAN SELESAI SAMPAI:
1. Orang bisa daftar via /join/register tanpa login dan data masuk ke EngineerCandidate NEW
2. Admin bisa lihat peta sebaran candidate di /admin/recruitment
3. Admin bisa screening -> training -> trial -> approve, dan saat approve otomatis jadi User FIELD_ENGINEER + wallet
4. Koordinator bisa lihat recruits nya dan dapat bonus 25rb jika recruit approved
5. Ada fitur Coverage Gap yang kasih tau kota mana kekurangan FE

---






Jadi kita tidak bisa kasih job SDWAN ke semua FE. Harus ada *Tiering Skill* di dalam app yang udah kamu buat.

Ini strategi biar resource EDC kamu bisa naik kelas ke SDWAN tanpa harus rekrut orang baru dari luar:

1. BEDAKAN 2 TIPE FE DI SISTEM KAMU

Di `User` dan `EngineerCandidate` yang udah ada, kita tinggal pakai field `skills` yang sudah ada:

- *FE L1 - EDC/LAN*: Skill `["EDC", "LAN"]` - Fee 75-100rb. Job: ganti EDC, crimping, cek kabel.
- *FE L2 - WAN/SDWAN*: Skill `["WAN", "SDWAN", "MIKROTIK", "FORTIGATE"]` - Fee 250-500rb/job. Job: pasang router SDWAN, migrasi, troubleshooting tunnel.

Anak SMK yang L1 kalau trust_score >90 dan sudah 30 job, bisa kamu *upskill gratis* jadi L2.

2. UPGRADE APLIKASI BIAR SUPPORT SDWAN

Kita butuh checklist dan komisi yang beda. Ini *PROMPT 14 - MODUL SDWAN READY*:



### PROMPT 14.

KONTEKS: Resource yang sama sekarang akan handle job SDWAN (pasang router, konfigurasi tunnel, migrasi link). SDWAN butuh SOP, checklist, foto bukti, dan fee yang lebih tinggi serta validasi yang lebih ketat.

KERJAKAN INI:

### 1. UPDATE PRISMA SCHEMA
Update model Device:
- tambahkan field device_category Enum: EDC, ROUTER_SDWAN, SWITCH, ACCESS_POINT, SERVER
- tambahkan field sdwan_profile Json? // untuk simpan {serial, imei, tunnel_id, vpn_config, link1_isp, link2_isp}

Update CommissionRule:
- Pastikan sudah ada rule untuk ROUTER_SDWAN
- Seed 3 rule baru di seed:
 - SDWAN Install TIER1 base 350000 bonus 50000 penalty -75000
 - SDWAN Install TIER2 base 450000 bonus 50000 penalty -75000
 - SDWAN Install TIER3 base 600000 bonus 100000 penalty -100000
 - SDWAN Troubleshoot semua tier base 250000

Update Ticket:
- tambahkan field sdwan_checklist Json? // simpan hasil checklist
- tambahkan field is_swa String? // SWA number jika integrasi SDWAN vendor (ex: Telkom, Lintasarta)

### 2. BUAT CHECKLIST DINAMIS SDWAN
Buat file lib/checklists.ts:

export const CHECKLISTS = {
 EDC: ["Cek kabel power", "Cek kertas thermal", "Test transaksi", "Foto SN EDC", "Foto struk test"],
 SDWAN_INSTALL: [
 "Foto SN Router SDWAN & dus",
 "Foto rack sebelum & sesudah",
 "Cek Link 1 ISP (IP, latency) - input manual",
 "Cek Link 2 ISP (IP, latency)",
 "Foto tunnel status di dashboard (hijau)",
 "Test ping 8.8.8.8 via Link1",
 "Test ping 8.8.8.8 via Link2",
 "Test failover cabut Link1 (harus tetap online)",
 "Speedtest Link1 & Link2 (screenshot)",
 "Foto QR / Tunnel ID"
 ],
 SDWAN_TROUBLESHOOT: [
 "Cek lampu indikator router",
 "Cek log tunnel down",
 "Foto error di dashboard SDWAN",
 "Test ping ke controller",
 "Restart router (foto sebelum/sesudah)",
 "Cek kabel LAN/WAN"
 ]
}

- Di halaman /engineer/tickets/[id] saat status IN_PROGRESS, tampilkan checklist sesuai device_category. FE harus centang satu per satu dan input data (latency, IP, speedtest). Tidak bisa klik RESOLVED sebelum semua checklist dicentang.
- Setiap checklist item yang butuh foto, wajib upload foto via /api/upload.

### 3. BUAT MODUL SKILL CERTIFICATION
Buat model baru:

model SkillCertification {
 id String @id @default(cuid())
 engineer_id String
 engineer User @relation(fields: [engineer_id], references: [id])
 skill String // SDWAN, MIKROTIK, FORTIGATE, etc
 level String // BASIC, INTERMEDIATE, EXPERT
 certified_at DateTime @default(now())
 certified_by String? // admin id
 expiry_at DateTime?
 certificate_url String?
 is_active Boolean @default(true)
}

Update User: tambahkan certifications SkillCertification[]

- Buat halaman /admin/engineers/[id]/certifications:
 - Tabel sertifikasi FE, tombol Add Certification (pilih skill SDWAN, level, upload sertifikat)
 - Jika FE belum punya sertifikasi SDWAN level BASIC, dia tidak akan muncul di auto dispatch untuk ticket SDWAN

- Update lib/dispatch.ts:
 - Jika ticket device_category == ROUTER_SDWAN, filter engineer yang punya SkillCertification skill=SDWAN is_active=true + trust_score >85 + minimal 20 ticket EDC/WAN sebelumnya

### 4. BUAT HALAMAN KNOWLEDGE BASE SDWAN
Buat halaman /admin/kb dan /engineer/kb

- CRUD Knowledge Base: judul, kategori (EDC/SDWAN), content markdown, video_url (YouTube), file PDF SOP
- Di mobile engineer, saat buka ticket SDWAN, tampilkan tombol "Lihat SOP SDWAN" yang link ke KB yang relevan
- Seed 3 KB dummy: "Cara Install Router SDWAN Telkom", "Troubleshoot Tunnel Down", "Cara Test Failover"

### 5. UPDATE RECRUITMENT UNTUK SDWAN
Update /join/register:

- Di step skill, tambahkan opsi "SDWAN" "Mikrotik" "Fortigate" "Cisco" dengan label "Advanced - Fee Lebih Tinggi"
- Jika candidate centang SDWAN, di form screening tampilkan pertanyaan tambahan: "Pernah config router? Sebutkan tipe router yang pernah", "Paham IP Static/DHCP/NAT?"
- Di /admin/recruitment, tambahkan badge khusus untuk candidate yang punya skill SDWAN (warna ungu) agar mudah di-filter
- Di Coverage Gap, hitung juga kebutuhan FE SDWAN per kota

### 6. UPDATE LEADERBOARD & ANTI-FRAUD KHUSUS SDWAN
- Di lib/antifraud.ts tambahkan check khusus SDWAN:
 - Jika ticket SDWAN tapi durasi ON_SITE < 20 menit => flag HIGH (tidak mungkin install SDWAN <20 menit)
 - Wajib ada foto speedtest & tunnel status, jika tidak ada => tahan komisi
- Di leaderboard, beri bobot lebih untuk SDWAN: 1 ticket SDWAN = 3 poin, 1 ticket EDC = 1 poin

JANGAN SELESAI SAMPAI:
1. Ticket dengan device_category ROUTER_SDWAN hanya bisa di-assign ke engineer yang punya sertifikasi SDWAN
2. Saat FE kerjakan ticket SDWAN, checklist SDWAN_INSTALL muncul dan wajib diisi + foto
3. Admin bisa kasih sertifikasi SDWAN ke engineer di detail engineer
4. Komisi SDWAN otomatis 350-600rb sesuai rule

---

STRATEGI REKRUT & UPSKILL SDWAN TANPA KELUAR UANG BANYAK:

*1. Saring dari FE EDC existing (Gratis)*
Filter di `/admin/recruitment` -> skill MIKROTIK. Biasanya anak SMK yang hobi warnet ada yang bisa Mikrotik. Itu modal dasar SDWAN. Kasih mereka training 2 hari via Zoom + KB video, langsung jadi FE SDWAN L2.

*2. Target Baru: Mahasiswa & Teknisi ISP*
Selain SMK, posting di grup:
- "Mikrotik Indonesia"
- "Fortigate Indonesia"
- "Teknisi Telkom / Lintasarta / ISP"
Mereka sudah jago SDWAN, tinggal kasih fee lebih tinggi 350rb mereka mau.

*3. Bikin Paket Training Berbayar (malah jadi income)*
Buat kelas "Certified SDWAN Field Engineer by FE-Track" harga 299rb, online 2 hari, dapat sertifikat + langsung masuk database FE prioritas SDWAN. Ini bisa jadi sumber rekrutmen yang bayar kamu.

Jadi *1 resource pool, 2 revenue stream*:
- EDC = volume banyak, fee kecil, untuk pemula
- SDWAN = volume sedikit, fee besar, untuk senior





### PROMPT 15 - MULTI KATEGORI SERVICE (Desktop/Laptop/WiFi/CCTV)*


Update FE-Track jadi Multi-Kategori Service: Desktop/Laptop/WiFi/CCTV + EDC + SDWAN - Ini PROMPT 15.

KONTEKS: Kita mau jadi marketplace semua teknisi IT. Customer bisa order: "Servis Laptop", "Pasang CCTV", "Benerin WiFi", dll. Satu resource FE bisa punya banyak skill, tapi fee & checklist beda per kategori.

KERJAKAN INI:

### 1. UPDATE PRISMA SCHEMA - TOTAL REWORK KATEGORI
Update model-model ini:

// Ganti Device model jadi lebih general
model ServiceCategory {
 id String @id @default(cuid())
 code String @unique // DESKTOP, LAPTOP, WIFI, CCTV, EDC, SDWAN, PRINTER, SERVER
 name String // "Desktop & PC", "Laptop", "WiFi & Access Point", "CCTV"
 icon String? // lucide icon name ex: "Monitor", "Laptop", "Wifi", "Cctv"
 base_fee_tier1 Int // fee dasar jabodetabek
 base_fee_tier2 Int
 base_fee_tier3 Int
 estimated_duration_minutes Int // estimasi pengerjaan, ex: 60 menit
 requires_certification Boolean @default(false) // SDWAN true, DESKTOP false
 checklist_template Json // array checklist default untuk kategori ini
 is_active Boolean @default(true)
}

model Device {
 // Ubah jadi:
 id String @id @default(cuid())
 service_category_id String
 service_category ServiceCategory @relation(fields: [service_category_id], references: [id])
 // field lama tetap: serial, tenant_id, etc
 brand String? // Asus, Hikvision, TP-Link
 model String? // model device
 //... field lama lainnya
}

Update CommissionRule:
- tambahkan service_category_id String? // relasi ke ServiceCategory, jika null = general
- relasi ke ServiceCategory

Update SkillCertification:
- skill sekarang refer ke ServiceCategory.code

Update EngineerCandidate & User:
- skills String[] sekarang isinya code ServiceCategory

Model baru untuk paket layanan (biar customer bisa order lebih spesifik):

model ServicePackage {
 id String @id @default(cuid())
 service_category_id String
 service_category ServiceCategory @relation(fields: [service_category_id], references: [id])
 name String // "Install Ulang Windows + Office", "Pasang CCTV 4 Channel", "Setting WiFi Mesh 3 Unit"
 description String?
 price_customer Int // harga jual ke customer
 fee_engineer Int // fee ke engineer
 estimated_duration Int
 checklist_template Json? // override checklist jika ada
 is_active Boolean @default(true)
}

### 2. SEED DATA LENGKAP 7 KATEGORI
Update prisma/seed.ts, buat ServiceCategory dengan data ini:

1. EDC - icon CreditCard - tier1 75000 tier2 100000 tier3 150000 - duration 30 - requires_cert false - checklist EDC lama
2. SDWAN - icon Router - tier1 350000 tier2 450000 tier3 600000 - duration 120 - requires_cert true
3. DESKTOP - icon Monitor - tier1 100000 tier2 125000 tier3 175000 - duration 60 - requires_cert false - checklist: ["Cek keluhan user", "Cek hardware (RAM, HDD)", "Install ulang / servis", "Test nyala & aplikasi", "Foto before/after", "Foto SN PC"]
4. LAPTOP - icon Laptop - tier1 125000 tier2 150000 tier3 200000 - duration 90 - requires_cert false - checklist: ["Cek keluhan", "Cek baterai/charger", "Bongkar & bersihkan", "Install/service", "Test semua port & keyboard", "Foto SN"]
5. WIFI - icon Wifi - tier1 150000 tier2 175000 tier3 225000 - duration 60 - checklist: ["Cek coverage sinyal lama", "Cek setting router/AP", "Pasang/Setting AP baru", "Test speedtest di 3 titik", "Foto speedtest", "Foto pemasangan AP"]
6. CCTV - icon Video - tier1 200000 tier2 250000 tier3 350000 - duration 120 - checklist: ["Cek jumlah channel & DVR", "Cek kabel & power", "Pasang kamera", "Setting DVR/NVR & HP client", "Test rekaman & playback", "Foto hasil CCTV di HP", "Foto SN DVR & Kamera"]
7. PRINTER - icon Printer - tier1 100000 tier2 125000 tier3 150000 - duration 45

Dan buat ServicePackage contoh minimal 3 per kategori, ex:
- DESKTOP: "Install Ulang Windows 10/11 + Office + Driver" price 250k fee 100k
- LAPTOP: "Ganti Pasta + Bersihkan + Install Ulang" price 300k fee 125k
- WIFI: "Pasang WiFi Mesh 2 Unit + Setting" price 500k fee 150k
- CCTV: "Pasang CCTV 2 Channel Full Set" price 1.5jt fee 400k, "Servis CCTV Offline" price 300k fee 150k

### 3. UPDATE AUTO DISPATCH LOGIC
Edit lib/dispatch.ts:

- function findEngineersForTicket(ticket):
 1. Ambil service_category dari ticket.device.service_category
 2. Filter User FIELD_ENGINEER where skills has service_category.code AND is_active AND is_suspended=false AND is_coordinator=false
 3. Jika service_category.requires_certification=true, filter juga yang punya SkillCertification untuk code tersebut yang is_active
 4. Urutkan by jarak rumah engineer ke tenant + trust_score + level
 5. Jika kategori CCTV/WIFI/LAPTOP yang butuh bawa barang, prioritas yang has_toolkit=true & has_motorcycle=true

- Update juga untuk bisa dispatch multi-engineer jika ticket ServicePackage adalah paket besar (ex: CCTV 8 channel butuh 2 orang). Tambahkan field di Ticket: required_engineers Int @default(1)

### 4. UPDATE HALAMAN & FLOW

a) /admin/service-categories - CRUD ServiceCategory + ServicePackage:
- Tabel kategori dengan icon, base fee tier, duration, requires_cert, jumlah ticket
- Di detail kategori, ada tab ServicePackage (CRUD paket)
- Tombol Edit Checklist Template (JSON editor simple)

b) /admin/tickets/create:
- Step 1: Pilih Tenant
- Step 2: Pilih ServiceCategory (tampilkan sebagai grid card dengan icon)
- Step 3: Pilih ServicePackage (optional, jika pilih paket maka auto isi deskripsi & fee)
- Step 4: Pilih Device (filter by service_category) atau buat baru
- Step 5: Deskripsi keluhan

c) /engineer/tickets/[id]:
- Tampilkan ServiceCategory badge dengan warna beda per kategori (EDC biru, SDWAN ungu, CCTV merah, WIFI hijau, LAPTOP orange, dll)
- Tampilkan checklist sesuai service_category.checklist_template ATAU service_package.checklist_template jika ada
- Jika kategori CCTV, wajib ada foto hasil rekaman di HP + foto pemasangan
- Jika WIFI, wajib ada foto speedtest (validasi anti-fraud: cek apakah foto speedtest mengandung angka Mbps via OCR simple atau minimal ada tulisan Mbps)
- Estimasi durasi tampilkan biar FE tau

d) /admin/recruitment & /join/register:
- Update pilihan skill jadi multi-select checkbox dengan 7 kategori + icon. Tampilkan fee per kategori biar candidate tertarik: "CCTV - Fee up to Rp 400rb/job"
- Di form candidate, tambahkan field: "Punya kendaraan roda 4? (untuk bawa tangga CCTV)", "Punya tangga?", "Punya bor?"
- Di admin recruitment, filter by ServiceCategory

### 5. UPDATE LEADERBOARD & KOMISI
- Leaderboard sekarang bisa filter per ServiceCategory: "Top FE CCTV Bulan Ini", "Top FE Laptop"
- Komisi dihitung dari ServiceCategory.base_fee + bonus/penalti + jika ada ServicePackage pakai fee_engineer dari package
- Badge di profil engineer: "Spesialis CCTV", "Expert WiFi", dll berdasarkan jumlah ticket per kategori >10

### 6. UPDATE LANDING PAGE /join
- Hero ganti jadi: "Jadi Teknisi Freelance All-in-One: EDC, Laptop, WiFi, CCTV. Fee 100rb - 600rb per job"
- Tampilkan 7 kategori sebagai card dengan icon dan fee
- Tambahkan kalkulator penghasilan: "Jika seminggu kerjakan 3 CCTV + 5 Laptop, penghasilan Rp 1.850.000"

### 7. BUAT HALAMAN CUSTOMER ORDER (OPTIONAL TAPI POWERFUL)
Buat halaman public /order (tanpa login):
- Customer bisa order langsung: pilih kategori, pilih paket, isi alamat & WA, upload foto kerusakan
- Submit jadi Ticket dengan status OPEN dan source="PUBLIC_ORDER"
- Admin tinggal approve dan auto dispatch
- Ini bikin kamu bisa dapet customer UMKM langsung, tidak hanya corporate

JANGAN SELESAI SAMPAI:
1. Seed 7 ServiceCategory + minimal 15 ServicePackage berhasil
2. Create ticket bisa pilih ServiceCategory dan checklist dinamis muncul di engineer
3. Auto dispatch hanya kirim ke FE yang punya skill sesuai kategori + sertifikasi jika required
4. Landing page /join tampilkan 7 kategori
5. Komisi untuk CCTV/WIFI/LAPTOP terhitung benar sesuai base_fee tier
6. Filter recruitment by skill kategori berfungsi

---



#### PROMPT 16 - MODUL LEGAL & KEPATUHAN KEMITRAAN*

Buat Modul Legal & Kepatuhan Kemitraan untuk hindari pelanggaran UU Ketenagakerjaan - Ini PROMPT 16.

KONTEKS: Kita pakai model KEMITRAAN bukan KARYAWAN seperti Gojek. Semua FE freelance harus tanda tangan Perjanjian Kemitraan digital sebelum bisa ambil job. App harus bisa buktikan bahwa FE bebas tolak job, tidak ada jam kerja, fee per job, dan alat milik sendiri. Ini untuk perlindungan hukum.

KERJAKAN INI:

### 1. UPDATE PRISMA SCHEMA
Tambahkan model-model ini:

model PartnershipAgreement {
 id String @id @default(cuid())
 version String // ex: "v1.0 - 2025", "v2.0 - SDWAN"
 title String @default("Perjanjian Kemitraan Mitra Teknisi FE-Track")
 content_html String @db.Text // isi perjanjian lengkap dalam HTML
 is_active Boolean @default(false) // hanya 1 yang active sebagai template terbaru
 created_at DateTime @default(now())
 created_by String?
}

model EngineerAgreement {
 id String @id @default(cuid())
 engineer_id String
 engineer User @relation(fields: [engineer_id], references: [id])
 agreement_id String
 agreement PartnershipAgreement @relation(fields: [agreement_id], references: [id])
 status AgreementStatus // PENDING, SIGNED, EXPIRED, REVOKED
 signed_at DateTime?
 signature_data String? @db.Text // base64 image signature dari canvas
 ip_address String?
 user_agent String?
 id_card_verified Boolean @default(false)
 // bukti consent
 consent_text String // "Saya menyetujui bahwa ini adalah kemitraan bukan hubungan kerja..."
 created_at DateTime @default(now())
 @@unique([engineer_id, agreement_id])
}

model ComplianceLog {
 id String @id @default(cuid())
 engineer_id String
 engineer User @relation(fields: [engineer_id], references: [id])
 type ComplianceType // JOB_ACCEPT, JOB_REJECT, JOB_TIMEOUT, LOGIN, LOGOUT, TOOL_CHECK
 ticket_id String?
 metadata Json? // {reason_reject, distance, etc}
 created_at DateTime @default(now())
}

Enum:
enum AgreementStatus { PENDING, SIGNED, EXPIRED, REVOKED }
enum ComplianceType { JOB_ACCEPT, JOB_REJECT, JOB_TIMEOUT, LOGIN, LOGOUT, TOOL_CHECK, AGREEMENT_SIGNED }

Update User:
- tambahkan agreements EngineerAgreement[]
- tambahkan compliance_logs ComplianceLog[]
- tambahkan field partnership_status Enum: NOT_SIGNED, SIGNED, EXPIRED
- tambahkan field tools_owned Json? // ["motorcycle", "toolkit", "laptop", "bor", "tangga"] dari form join
- tambahkan field can_work_for_others Boolean @default(true) // bukti boleh kerja di tempat lain

Update Ticket:
- tambahkan field rejected_by String[] // array engineer_id yang menolak job ini (untuk bukti mereka bebas menolak)

### 2. BUAT SEED PERJANJIAN KEMITRAAN v1.0
Buat file prisma/seed-agreement.ts atau update seed.ts:

Buat PartnershipAgreement is_active=true dengan content_html isinya template perjanjian kemitraan yang aman (buat HTML rapi dengan pasal-pasal):

Judul: PERJANJIAN KEMITRAAN MITRA TEKNISI FE-TRACK
Nomor: PKM/{engineer_id}/{year}

Pasal-pasal wajib ada (buat dalam <ol>):
1. Definisi: Platform sebagai penyedia aplikasi, Mitra sebagai penyedia jasa mandiri
2. Hubungan Hukum: Tegaskan ini adalah KEMITRAAN bukan HUBUNGAN KERJA sesuai Permenkop 11/2015 dan UU 6/2023. Tidak ada unsur upah tetap, perintah jam kerja, dan PKWT/PKWTT
3. Hak Mitra: Bebas menerima/menolak order, bebas bekerja untuk pihak lain, bebas menentukan waktu kerja, menggunakan alat milik sendiri
4. Kewajiban Mitra: Menjaga kualitas, tidak fake GPS, menjaga kerahasiaan data tenant
5. Sistem Fee: Fee per ticket closed, bukan gaji bulanan. Tidak ada THR, BPJS TK, pesangon. Fee dibayar via wallet
6. Alat Kerja: Kendaraan dan toolkit milik mitra sendiri
7. Jangka Waktu: Tidak ada jangka waktu tetap, mitra bisa berhenti kapan saja
8. Penyelesaian Sengketa: Musyawarah mufakat

Di bawah tambahkan checkbox consent: "Saya telah membaca dan menyetujui bahwa hubungan ini adalah kemitraan, bukan hubungan kerja. Saya bebas menolak pekerjaan dan bekerja di tempat lain."

### 3. BUAT FLOW E-SIGN DI ENGINEER APP
Update flow pendaftaran dan engineer dashboard:

a) Saat candidate APPROVED jadi User FIELD_ENGINEER:
- Otomatis buat EngineerAgreement dengan status PENDING, agreement_id = yang is_active
- Set User.partnership_status = NOT_SIGNED

b) Buat halaman /engineer/agreement (wajib diakses pertama kali setelah login):
- Jika partnership_status!= SIGNED, redirect semua halaman engineer ke /engineer/agreement (middleware di lib/auth.ts)
- Tampilkan content_html perjanjian (render dengan dangerouslySetInnerHTML)
- Di bawah tampilkan data diri engineer, NIK, tools_owned
- Canvas tanda tangan digital (pakai library react-signature-canvas atau buat canvas HTML5 sederhana)
- Checkbox: "Saya menyetujui..."
- Tombol "Tanda Tangan & Setuju"
- Saat klik: simpan signature_data base64, ip_address, user_agent, signed_at=now(), status=SIGNED, partnership_status=SIGNED
- Buat ComplianceLog type AGREEMENT_SIGNED
- Setelah signed, baru bisa akses /engineer/tickets

c) Di /engineer/profile tampilkan status Kemitraan: "Status: Mitra Aktif - Perjanjian v1.0 ditandatangani 01 Jan 2025" + tombol Lihat Perjanjian (read-only) + Download PDF (generate PDF dari HTML pakai jsPDF di client)

### 4. UPDATE LOGIC ACCEPT/REJECT UNTUK BUKTI KEPATUHAN
Edit app/actions/tickets.ts dan lib/dispatch.ts:

- Saat ticket di-dispatch ke engineer, buat ComplianceLog type JOB_ACCEPT atau JOB_REJECT
- Di halaman /engineer/tickets/[id] ada 2 tombol besar: TERIMA JOB dan TOLAK JOB
- Jika TOLAK: muncul modal alasan (Jauh, Ada kerjaan lain, Sakit, dll) - simpan ke ComplianceLog metadata.reason_reject dan tambahkan engineer_id ke ticket.rejected_by
- PENTING: Tolak job tidak boleh langsung suspend atau potong trust_score banyak. Hanya -1 poin saja. Jika engineer tolak 5x berturut-turut, tetap tidak boleh auto suspend (hanya kasih notif). Ini bukti dia bebas.
- Jika engineer tidak respon dalam 15 menit, status jadi TIMEOUT dan buat log JOB_TIMEOUT

### 5. BUAT HALAMAN ADMIN - LEGAL & COMPLIANCE
Buat halaman /admin/legal

- Tab 1: Template Perjanjian - CRUD PartnershipAgreement, ada editor HTML (pakai textarea atau rich text sederhana), tombol Set Active (hanya 1 yang bisa active), versioning
- Tab 2: Daftar Perjanjian Mitra - tabel semua EngineerAgreement dengan filter status, search engineer, tombol Lihat Tanda Tangan, Download PDF, Revoke
- Tab 3: Compliance Dashboard -
 KPI: Total Mitra Signed, Belum Signed, Total Job Ditolak (bukti bebas), Rata-rata Accept Rate
 Tabel ComplianceLog terbaru: engineer, type, ticket_no, timestamp, metadata
 Filter by engineer & type
 Tombol Export Compliance Report Excel (untuk bukti ke Disnaker jika ada audit: export log yang menunjukkan FE sering menolak job = bukti bukan karyawan)
- Tab 4: Audit Trail - tampilkan Engineer yang partnership_status NOT_SIGNED tapi sudah ambil job (harus 0, jika ada kasih warning merah)

### 6. UPDATE MIDDLEWARE & SECURITY
- Buat middleware di app/(engineer)/layout.tsx: cek jika user.role==FIELD_ENGINEER dan partnership_status!=SIGNED, redirect ke /engineer/agreement
- Di API /api/engineer/tickets/accept, cek dulu partnership_status harus SIGNED, jika tidak return error "Anda harus tanda tangan perjanjian kemitraan dulu"
- Di /admin/engineers/[id] tampilkan badge: Kemitraan Signed / Belum Signed + tools_owned + can_work_for_others

### 7. BUAT FITUR DOWNLOAD & EXPORT LEGAL
- Buat API GET /api/agreement/[id]/pdf yang generate PDF dari content_html + data engineer + signature image (pakai jsPDF atau puppeteer di server, jika puppeteer berat, buat client-side saja)
- Di /admin/recruitment detail candidate, tambahkan field: tools_owned sudah diisi atau belum
- Di /admin/payroll tambahkan disclaimer di footer: "Fee ini adalah pendapatan kemitraan, bukan upah kerja. Tidak termasuk BPJS TK, THR, dan pesangon sesuai Perjanjian Kemitraan vX"

### 8. SEED & TESTING
- Seed PartnershipAgreement v1.0
- Saat seed engineer dummy, buat EngineerAgreement SIGNED untuk semua engineer dummy
- Buat file LEGAL_COMPLIANCE.md penjelasan: Kenapa model kemitraan aman, 3 unsur hubungan kerja yang dihindari, dan cara jawab jika Disnaker tanya

DEPENDENCIES:
- npm install react-signature-canvas (atau buat canvas manual pakai HTML5 canvas)
- npm install jspdf (untuk download PDF perjanjian)

JANGAN SELESAI SAMPAI:
1. Engineer baru login langsung di-redirect ke /engineer/agreement dan tidak bisa ambil job sebelum tanda tangan
2. Tanda tangan tersimpan dan bisa dilihat admin di /admin/legal
3. Tombol Tolak Job ada dan menyimpan ComplianceLog JOB_REJECT dengan alasan
4. Admin bisa export Compliance Report Excel yang menunjukkan bukti FE bebas menolak job
5. Ada 1 template PartnershipAgreement active di DB

---

Setelah prompt ini jalan, kamu punya *tameng hukum digital*:

1. Setiap FE punya bukti e-sign: IP, waktu, tanda tangan, persetujuan "ini kemitraan bukan karyawan"
2. Setiap penolakan job tercatat = bukti kuat di Disnaker bahwa kamu tidak memberi perintah
3. Kalau ada FE nakal lapor ke Disnaker minta THR/pesangon, kamu tinggal export PDF perjanjian + log compliance

*Urutan jalanin prompt sekarang jadi 0-16 lengkap.*

Mau aku bikinin *draft isi Perjanjian Kemitraan v1.0 yang full 8 pasal* tinggal paste ke seed?