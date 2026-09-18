# FE-Track — Entity Relationship Diagram (ERD)

Sumber kebenaran: `prisma/schema.prisma`. Diagram di bawah merangkum entitas utama & relasi.

---

## 1. Diagram inti (Mermaid)

```mermaid
erDiagram
  User ||--o{ Ticket : "assigned_engineer"
  User ||--o{ TicketLog : "changed_by"
  User ||--o{ AppNotification : receives
  User ||--o{ SkillCertification : has
  User ||--o{ EngineerWallet : has
  User ||--o{ EngineerAgreement : signs
  User ||--o{ ComplianceLog : logs
  User ||--o{ EngineerContract : "PKWT contracts"
  User ||--o{ EngagementChangeLog : "engagement flips"

  Tenant ||--o{ Device : owns
  Tenant ||--o{ Ticket : opens

  Device ||--o{ Ticket : "device_id"
  Device }o--o| ServiceCategory : categorized

  ServiceCategory ||--o{ ServicePackage : packages
  ServiceCategory ||--o{ Ticket : "on ticket"

  Ticket ||--o{ TicketLog : timeline
  Ticket ||--o| ExternalTicket : linked
  Ticket ||--o| EngineerRating : rated
  Ticket ||--o{ FraudLog : flags
  Ticket ||--o{ WalletTransaction : commission

  Integration ||--o{ ExternalTicket : owns
  Integration ||--o{ WebhookDeadLetter : dlq

  SlaConfig ||--|| Tenant : "tier (logical)"

  PartnershipAgreement ||--o{ EngineerAgreement : versioned

  Sparepart }o--o| User : "holder engineer"

  User {
    string id PK
    string phone UK
    string role
    string[] skills
    float lat
    float lng
    string status
    string partnership_status
    string engagement_type
    string employment_status
  }

  EngineerContract {
    string id PK
    string user_id FK
    string type
    string status
    datetime start_at
    datetime end_at
    string[] placement_cities
    string[] placement_tenant_ids
  }

  EngagementChangeLog {
    string id PK
    string user_id FK
    string from_type
    string to_type
    string reason
  }

  Tenant {
    string id PK
    string code UK
    string sla_tier
    float lat
    float lng
  }

  Device {
    string id PK
    string tenant_id FK
    string type
    string status
    string serial_number UK
  }

  Ticket {
    string id PK
    string ticket_no UK
    string tenant_id FK
    string device_id FK
    string status
    datetime sla_due_at
    datetime sla_paused_at
    int sla_paused_total_ms
    json l1_handover
  }

  TicketLog {
    string id PK
    string ticket_id FK
    string status_to
    string[] photo_url
    float lat
    float lng
  }

  Integration {
    string id PK
    string api_key UK
    string webhook_url
  }

  WebhookDeadLetter {
    string id PK
    string integration_id FK
    string event
    string status
    json payload
  }
```

---

## 2. Domain groups

### 2.1 Identity & engagement
| Model | Keterangan |
|-------|------------|
| `User` | Admin, NOC L0/L1, Dispatcher, Field Engineer; `engagement_type`, `employment_status` |
| `SkillCertification` | Sertifikasi skill (aktif + expiry) |
| `PartnershipAgreement` | Template perjanjian kemitraan (Mitra) |
| `EngineerAgreement` | Tanda tangan per engineer Mitra |
| `EngineerContract` | Kontrak PKWT (placement kota/tenant, masa berlaku) |
| `EngagementChangeLog` | Audit flip MITRA ↔ PKWT |
| `ComplianceLog` | Audit compliance (timeout, reject, dll.) |

### 2.2 Asset & lokasi
| Model | Keterangan |
|-------|------------|
| `Tenant` | Toko / site + SLA tier + koordinat |
| `Device` | EDC / Router / Switch + status UP/DOWN |
| `Sparepart` | Stok gudang / dipegang engineer |
| `SlaConfig` | Response & resolution time per tier |

### 2.3 Ticketing & SLA
| Model | Keterangan |
|-------|------------|
| `Ticket` | Inti operasional; stop-clock; L1 handover JSON |
| `TicketLog` | Audit trail status + foto + GPS |
| `ServiceCategory` / `ServicePackage` | Kategori layanan & paket harga |
| `AppNotification` | Bell in-app |

### 2.4 Integrasi
| Model | Keterangan |
|-------|------------|
| `Integration` | Customer ITSM + API key + webhook |
| `ExternalTicket` | Mapping ID eksternal ↔ internal |
| `WebhookDeadLetter` | DLQ outbound gagal |

### 2.5 Komisi, fraud, talent
| Model | Keterangan |
|-------|------------|
| `CommissionRule`, `EngineerWallet`, `WalletTransaction`, `Withdrawal` | Fee & payout **Mitra only** (PKWT → payroll HR) |
| `EngineerRating`, `FraudLog` | Anti-fraud & rating (hold komisi hanya Mitra) |
| `LeaderboardSnapshot` | Ranking periodik (query MITRA) |
| `EngineerCandidate` | Pipeline recruitment |
| `KnowledgeBase` | SOP / artikel |

---

## 3. Enum status ticket (urutan bisnis)

```
OPEN → ASSIGNED → ON_THE_WAY → ON_SITE → IN_PROGRESS
  → PENDING_SPAREPART | PENDING_L1 | ESCALATED | PENDING_REVIEW
  → RESOLVED → CLOSED
```

Field SLA khusus pada `Ticket`:
- `sla_due_at` — target resolve
- `sla_paused_at` / `sla_paused_total_ms` / `stop_clock_reason` — stop clock
- `stop_clock_approval_status` / `stop_clock_requested_*` / `stop_clock_approved_*` — approve L1
- `l1_handover` — JSON handover L0→L1
- `escalated_to_l1_at` / `escalated_by_id`

Model tambahan Sprint D + Engagement:
- `PushDeviceToken` — FCM token per user
- `SparepartMutation` — ledger IN/OUT/ADJUST (opsional `ticket_id`)
- `EngineerContract` / `EngagementChangeLog` — lihat [ENGAGEMENT.md](./ENGAGEMENT.md)

---

## 4. Relasi kritis (ringkas)

```
Tenant 1──* Device
Tenant 1──* Ticket
Device 0..1──* Ticket
User (FE) 0..1──* Ticket (assigned)
Ticket 1──* TicketLog
Ticket 0..1──1 ExternalTicket
Ticket 0..*── SparepartMutation
Sparepart 1──* SparepartMutation
Integration 1──* ExternalTicket
Integration 1──* WebhookDeadLetter
User 1──* AppNotification
User 1──* PushDeviceToken
User 1──* SkillCertification
User 1──* EngineerContract
User 1──* EngagementChangeLog
```

---

## 5. Cara generate diagram visual

1. Buka file ini di GitHub / VS Code (Mermaid preview).
2. Atau: https://mermaid.live — paste blok `erDiagram`.
3. Schema lengkap: `npx prisma format` lalu baca `prisma/schema.prisma`.

Untuk ERD otomatis dari DB:

```bash
# opsional — butuh tool tambahan
npx prisma db pull
# atau gunakan pgAdmin / DBeaver ERD dari Postgres :5433
```
