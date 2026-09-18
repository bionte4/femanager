# FE-Track — Kerangka Pitch Deck
### Untuk CEO & Investor | Marketplace Field Engineer Indonesia

**Durasi saran:** 12–15 menit + 10 menit Q&A  
**Nada:** tajam, operasional, credible — bukan “AI hype”  
**Satu kalimat positioning:**  
> *SLA Field Ops OS* — marketplace + NOC yang membuat jaringan toko nasional bisa dijamin 99% uptime.

**Outline visual interaktif (Canvas):** buka `pitch-deck-visual-outline` di panel Canvas Cursor — navigator 18 slide + Act A–E + speaker notes.

Gunakan file ini sebagai **script slide-by-slide** (PowerPoint / Pitch / Google Slides).  
Setiap slide: **headline kuat** + **1 visual** + **speaker note**.

---

## Desain visual (wajib konsisten)

| Elemen | Arah |
|--------|------|
| Warna | Dark navy + hijau “SLA meet” + aksen amber “breach” — hindari ungu generik |
| Tipografi | Display kuat untuk headline; body pendek |
| Visual hero | Peta Indonesia + titik toko merah/hijau + FE di jalan |
| Data | Angka besar, max 3 KPI per slide |
| Larangan | Wall of text, 10 bullet, screenshot UI penuh tanpa cerita |

**Aturan emas:** setiap slide harus bisa dibaca dalam **5 detik**.

---

## Alur narasi (arc investor)

```
Pain nasional → Why now → Solusi OS → Marketplace dual mode
→ Market & money → Moat → Traction/product → GTM → Ask → Vision
```

---

# BAGIAN A — Hook (Slide 1–3)

### Slide 1 — Title
**Headline:** FE-Track  
**Sub:** Marketplace Field Engineer + SLA Operating System untuk jaringan toko se-Indonesia  
**Footer:** Confidential | [Tanggal] | [Nama presenter]

*Visual:* full-bleed map cluster toko + FE en-route (bukan logo kecil di sudut).

**Speaker:** “Kami membangun sistem operasi lapangan untuk SLA 99% — bukan sekadar ticketing.”

---

### Slide 2 — The Cost of Silence
**Headline:** Satu EDC down di toko = transaksi hilang. Ribuan toko = risiko sistemik.  
**3 angka besar (isi dengan estimasi yang bisa kalian bela):**
- Rp ___ / jam lost sales per toko down
- ___ menit rata-rata response hari ini (WA / manual)
- ___% ticket tanpa bukti GPS + foto before/after

*Visual:* timeline “Alert → WA group → FE salah kota → SLA breach → dispute bank”.

**Speaker:** Buka dengan rasa sakit CEO merchant/bank — bukan fitur software.

---

### Slide 3 — Why Now
**Headline:** Infrastruktur retail digital sudah nasional. Operasi lapangan belum.  
**3 driver:**
1. Densitas EDC / SDWAN / CCTV / WiFi toko naik tajam  
2. SLA customer (bank, MSP) makin ketat & diaudit  
3. Talent teknis daerah tersedia — tapi belum ter-orchestrate  

*Visual:* “Demand up × Ops still WhatsApp = opportunity”

---

# BAGIAN B — Problem & Solution (Slide 4–7)

### Slide 4 — Broken Status Quo
**Headline:** Field service masih dijalankan seperti grup chat.  
| Cara lama | Akibat |
|-----------|--------|
| Assign manual / WA | Lambat, bias, tidak scalable |
| FE salah skill / jauh | Biaya tinggi, breach |
| Alert monitoring dobel | Noise NOC |
| Tidak ada bukti on-site | Dispute & fraud |
| Komisi tidak jelas | FE churn |

*Visual:* 1 diagram “chaos stack” → silang merah.

---

### Slide 5 — The Product
**Headline:** FE-Track = NOC + Marketplace FE + Trust Layer dalam satu OS.  
**4 pilar (ikon besar):**
1. **Dispatch cerdas** — jarak + skill + sertifikasi  
2. **SLA governance** — countdown, stop-clock, laporan fase, PDF customer  
3. **Trust** — GPS 100m, foto before/after, anti-fraud  
4. **Dual workforce** — Mitra (komisi) + PKWT (kontrak/placement)

*Visual:* arsitektur 1 slide: Monitoring → NOC L0/L1 → Dispatch → FE PWA → Wallet/Payroll → Customer ITSM.

---

### Slide 6 — How a Ticket Lives (Demo story)
**Headline:** Dari alert sampai resolved — tanpa grup WhatsApp.  
**Flow horizontal (6 step):**
`Alert → Dedup → L0 triage → L1 assign → FE accept → Check-in 100m → Resolve + bukti → Komisi/Payroll`

*Visual:* storyboard; highlight **15 menit accept timeout** & **auto re-assign**.

**Speaker:** Ceritakan 1 ticket seolah live demo (bahkan tanpa buka laptop).

---

### Slide 7 — Marketplace, tapi Compliant
**Headline:** Dua mode kerja. Satu platform. Legal & unit economics terpisah.  
| | **Mitra** | **PKWT** |
|--|-----------|----------|
| Model | Marketplace kemitraan | Kontrak kerja |
| Bayar | Fee / ticket (wallet) | Payroll HR |
| Reject job | Bebas (bukti kemitraan) | Tidak |
| Coverage | Fleksibel nasional | Placement kota/client |

*Visual:* dua jalur paralel — “scale” vs “dedicated client”.

**Speaker (CEO/investor care):** “Kami tidak campur gaji karyawan dengan fee marketplace — isolasi pay sudah di-build.”

---

# BAGIAN C — Market & Money (Slide 8–11)

### Slide 8 — Who Pays
**Headline:** Pembeli = pemilik risiko SLA.  
**4 segmen (kartu):**
- Bank / acquirer EDC  
- ISP / SDWAN MSP  
- Retail chain / franchise  
- Vendor NOC / field service outsourcing  

*Visual:* logos placeholder + “ICP beachhead: Jabodetabek Tier-1 EDC”.

---

### Slide 9 — Market Size (kerangka — isi angka kalian)
**Headline:** Pasar field ops retail Indonesia cukup besar untuk membangun category king.  
```
TAM  — seluruh field service IT retail / payment / MSP Indonesia
SAM  — jaringan toko dengan SLA perangkat (EDC/LAN/WAN/SDWAN)
SOM  — 1–2 pilot bank/MSP + 1–3 kota (12 bulan)
```
*Visual:* funnel TAM→SAM→SOM.  
**Catatan:** jangan mengarang angka; sisakan “working draft” atau sumber riset.

---

### Slide 10 — Business Model
**Headline:** Revenue bertingkat — SaaS + take-rate ticket + integrasi.  
| Stream | Logika |
|--------|--------|
| SaaS / toko / bulan | Recurring dari jaringan aktif |
| Margin ticket | `price_customer − fee_FE` |
| Integration & SLA PDF | Setup + retainer ITSM |
| Premium NOC / War Room | Dedicated ops |
| Recruitment & sertifikasi | Supply-side monetization |

*Visual:* stacked revenue bars “Year 1 → Year 3” (placeholder).

---

### Slide 11 — Unit Economics (1 ticket)
**Headline:** Setiap ticket ontime = unit profit yang bisa diukur.  
```
Revenue ticket
− Fee Mitra / cost PKWT
− Bonus ontime (+ Penalty breach)
− Cost platform (WA, map, hosting, NOC share)
= Contribution margin
```
**KPI produk yang sudah ada:** SLA Meet %, MTTR fase, coverage FE, fraud hold rate.

*Visual:* waterfall margin 1 ticket.

---

# BAGIAN D — Moat & Traction (Slide 12–15)

### Slide 12 — Why We Win
**Headline:** Bukan ITSM generik. Field-first + trust + dual workforce.  
**Moat bertumpuk:**
1. Data coverage & performance FE per kota  
2. Skill/cert graph + placement PKWT  
3. Audit trail yang bank percaya (GPS + foto + fraud)  
4. Integrasi monitoring ↔ ITSM (switching cost)  
5. Supply marketplace yang sulit ditiru cepat di daerah  

*Visual:* “moat layers” pyramid.

---

### Slide 13 — Competitive Landscape
**Headline:** Kompetitor menyelesaikan sebagian. Kami menyelesaikan rantai penuh.  
| | Spreadsheet+WA | ITSM generik | Vendor FE tunggal | **FE-Track** |
|--|----------------|--------------|-------------------|--------------|
| Dispatch geo+skill | ✗ | △ | △ | ✓ |
| SLA field + stop-clock | ✗ | △ | △ | ✓ |
| Trust GPS/foto/fraud | ✗ | ✗ | △ | ✓ |
| Marketplace Mitra | ✗ | ✗ | ✗ | ✓ |
| PKWT placement | ✗ | ✗ | △ | ✓ |

---

### Slide 14 — Product Reality (Traction proxy)
**Headline:** Platform sudah dibangun end-to-end — siap soft-launch.  
**Checklist “built” (centang besar):**
- ✅ Auto-dispatch + L0/L1 handover  
- ✅ PWA FE offline-aware + check-in 100m  
- ✅ Wallet Mitra + residual PKWT + payroll isolation  
- ✅ Anti-fraud + leaderboard Mitra  
- ✅ Open API / webhook + DLQ  
- ✅ Kontrak PKWT, placement, cron expire/remind  
- ✅ Panduan deploy VPS production  

*Visual:* product screenshot collage **dengan caption cerita**, bukan gallery.

**Speaker:** Bedakan jujur: *product built* vs *revenue traction*. Investor menghargai kejujuran.

---

### Slide 15 — Go-to-Market
**Headline:** Beachhead ketat → bukti SLA → ekspansi kota.  
| Fase | Fokus | Bukti sukses |
|------|-------|--------------|
| 0–6 bln | 1–2 pilot Jabodetabek, 50–100 FE | SLA meet target, MTTR turun |
| 6–18 bln | Tier 2/3 + SDWAN | Coverage heatmap, repeat contract |
| 18+ bln | Multi-enterprise + portal customer | Category leadership |

*Visual:* peta ekspansi kota (bukan 34 provinsi sekaligus).

---

# BAGIAN E — Ask & Close (Slide 16–18)

### Slide 16 — The Ask
**Headline:** Kami mencari [Mitra strategis / Seed / Bridge] untuk mendominasi beachhead.  
**Gunakan dana untuk (pie 100%):**
- __% Onboarding & sertifikasi FE kota target  
- __% NOC / ops runway pilot  
- __% Sales enterprise (bank/MSP)  
- __% Product (portal customer, capacity planning)  

**Milestone 12 bulan (max 4):**
1. ___ tenant aktif  
2. SLA meet ≥ ___%  
3. ___ ticket/bulan  
4. ___ kota covered  

*Visual:* pie use-of-funds + milestone timeline.

---

### Slide 17 — Vision
**Headline:** Menjadi “Uber + ServiceNow” untuk field ops retail Indonesia.  
Satu baris close:  
> *Setiap toko down punya engineer tepat, bukti kuat, dan SLA yang bisa dijual ke board.*

*Visual:* future state — heatmap nasional hijau.

---

### Slide 18 — Closing / Contact
**FE-Track**  
[Nama] · [Role] · [Email] · [WhatsApp]  
Demo: [link staging] · Deck: confidential  

**Appendix marker:** “Backup slides tersedia.”

---

# APPENDIX (siap jika ditanya)

| A1 | Detail legal Mitra vs PKWT (compliance) |
| A2 | Alur anti-fraud & hold komisi |
| A3 | Arsitektur teknis (Next.js, PostGIS, PWA) |
| A4 | Pricing skeleton & contoh ServicePackage |
| A5 | Risk register (coverage daerah, fraud, gateway WA) |
| A6 | Team & hiring plan |
| A7 | Financial model 36 bulan (jika ada) |

---

## Tips presentasi ke CEO vs Investor

| Audiens | Tekankan | Kurangi |
|---------|----------|---------|
| **CEO (customer/partner)** | SLA, risiko operasional, audit bank, time-to-fix | Cap table, dilusi |
| **Investor** | Market, unit economics, moat, use of funds, beachhead | Fitur UI bertele-tele |

**Kalimat pembuka yang kuat (pilih satu):**
1. “Kami menjual kepastian SLA — bukan software ticket.”  
2. “WhatsApp tidak bisa di-audit. Field ops bank harus bisa.”  
3. “Supply FE di daerah ada. Yang belum ada adalah sistem operasi.”  

**Kalimat penutup:**
> “Bantu kami men-soft-launch 1 kota. Angka SLA akan berbicara sendiri.”

---

## Checklist sebelum naik panggung

- [ ] Isi angka slide 2, 9, 11, 16 (jangan kosong / “TBD” besar)  
- [ ] 1 demo cerita ticket (60 detik) sudah dilatih  
- [ ] 1 screenshot War Room + 1 screenshot FE check-in  
- [ ] Jawaban siap: “Siapa kompetitor?” “Cara bayar FE?” “Legal Mitra?”  
- [ ] Backup slide legal & fraud  
- [ ] Durasi latihan ≤ 15 menit  

---

## Referensi internal

- [BUSINESS_PLAN.md](./BUSINESS_PLAN.md)  
- [ENGAGEMENT.md](./ENGAGEMENT.md)  
- [LEGAL_COMPLIANCE.md](../LEGAL_COMPLIANCE.md)  
- [USER_GUIDE.md](./USER_GUIDE.md)  
- [DEPLOYMENT_VPS.md](./DEPLOYMENT_VPS.md)  
