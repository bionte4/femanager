# Integration Testing Guide (PROMPT 10)

Panduan uji Open API & Webhook FE-Track.

## Prerequisites

```bash
docker compose up -d
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Akun admin: `081111111111` / `password123`

Demo API key (dari seed): `api_key_customer_demo`  
Demo tenant: `BRI-JKT-001`

---

## 1. Buat ticket dari customer ITSM

```bash
curl -s -X POST http://localhost:3000/api/v1/external/tickets \
  -H "X-API-KEY: api_key_customer_demo" \
  -H "Content-Type: application/json" \
  -d '{
    "external_ticket_id": "INC-BRI-001",
    "tenant_code": "BRI-JKT-001",
    "description": "EDC tidak bisa print",
    "priority": "high"
  }' | jq
```

**Expected:** HTTP 201

```json
{
  "success": true,
  "internal_ticket_no": "FE-YYYYMMDD-XXXX",
  "internal_ticket_id": "...",
  "sla_due_at": "...",
  "status": "ASSIGNED",
  "assigned_engineer": { "name": "...", "phone": "..." }
}
```

Cek di UI: `/admin/tickets` — ticket muncul & sudah di-dispatch.

Ulangi curl yang sama → HTTP **409** (duplicate external_ticket_id).

---

## 2. Get detail + timeline

```bash
curl -s http://localhost:3000/api/v1/external/tickets/INC-BRI-001 \
  -H "X-API-KEY: api_key_customer_demo" | jq
```

---

## 3. Close dari sisi customer

```bash
curl -s -X PATCH http://localhost:3000/api/v1/external/tickets/INC-BRI-001 \
  -H "X-API-KEY: api_key_customer_demo" \
  -H "Content-Type: application/json" \
  -d '{ "status": "closed", "notes": "Closed by customer" }' | jq
```

---

## 4. Test webhook (webhook.site)

1. Buka https://webhook.site → copy Unique URL  
2. Login admin → `/admin/integrations` → buka **Customer Demo**  
3. Paste URL ke Webhook URL → Simpan → **Test Webhook**  
4. Di webhook.site harus muncul POST `ticket.test` + header `X-Webhook-Signature`

Saat engineer update status di app, customer menerima event:
`ticket.assigned` | `ticket.on_the_way` | `ticket.on_site` | `ticket.resolved` | dll.

---

## 5. Validasi auth & rate limit

Tanpa key:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://localhost:3000/api/v1/external/tickets \
  -H "Content-Type: application/json" -d '{}'
# → 401
```

Key salah → 401.  
>60 request/menit → 429.

---

## 6. Admin UI checklist

- [ ] `/admin/integrations` — list + create (modal copy API key)  
- [ ] `/admin/integrations/[id]` — test webhook + external ticket table  
- [ ] `/admin/integrations/docs` — dokumentasi curl  
- [ ] Re-send webhook untuk yang failed  

---

## Catatan keamanan

- Jangan commit API key production ke git  
- Jangan log plain API key di server console  
- Validasi `X-Webhook-Signature` di sisi customer sebelum proses payload
