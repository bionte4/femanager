# FE-Track — Standard Kode

Konvensi kode untuk master data. Validasi otomatis di form & Excel import.

## Aturan umum

- UPPERCASE
- Pemisah hanya `-`
- Tanpa spasi / karakter khusus lain

## Gudang (`warehouse.code`)

**Pattern:** `SITE` — 2–4 huruf, boleh +1–2 digit

| Contoh | Arti |
|--------|------|
| `HQ` | Gudang pusat |
| `JKT` | Jakarta |
| `BDG` | Bandung |
| `SBY` | Surabaya |
| `JKT2` | Jakarta cabang 2 |

## Tenant (`tenants.code`)

**Pattern:** `CLIENT-CITY-###`

| Segmen | Aturan | Contoh |
|--------|--------|--------|
| CLIENT | 2–4 huruf | `BRI`, `BCA`, `ALF` |
| CITY | 2–4 huruf | `JKT`, `BDG`, `HQ` |
| SEQ | 3 digit | `001`, `021` |

Contoh: `BRI-JKT-001`, `ALF-BDG-012`, `DEMO-JKT-001`

## Sparepart SKU

**Pattern:** `CAT-BRAND-MODEL`

Prefix kategori: `EDC`, `RTR`, `SW`, `CBL`, `PWR`, `SIM`, `ANT`, `OTH`

Contoh: `EDC-BCA-ICT250`, `RTR-CISCO-4321`, `CBL-LAN-CAT6-5M`

SKU sama boleh di gudang berbeda — bedakan lewat `warehouse_code`.

## Kategori layanan

Fixed: `EDC`, `SDWAN`, `DESKTOP`, `LAPTOP`, `WIFI`, `CCTV`, `PRINTER`

## Ticket

Auto: `FE-YYYYMMDD-XXXX` — jangan diubah manual.

## Device serial

Utamakan serial pabrik. Fallback: `{TENANT_CODE}-{##}` → `BRI-JKT-001-01`
