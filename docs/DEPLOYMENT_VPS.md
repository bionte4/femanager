# FE-Track — Deployment & Operasional VPS

Panduan **install** + **runbook harian** production.  
Stack: **Docker PostGIS** · **Node 20** · **PM2** · **Nginx** · **Let's Encrypt** · **crontab**.

Dokumen terkait: [MANUAL_GUIDE.md](./MANUAL_GUIDE.md) · [ENGAGEMENT.md](./ENGAGEMENT.md) · [README.md](../README.md)

**Pasca reboot VPS:** langsung ke [§11 VPS reboot](#11-vps-reboot-auto-start--recovery).

---

## 0. Instance production (aktif)

| Item | Nilai |
|------|--------|
| Domain | **https://klikhadir.site** |
| App path | **`/opt/fetrack`** |
| Process | PM2 name `fetrack` → `next start` `:3000` |
| DB | Docker `fetrack-postgres` → host `127.0.0.1:5433` |
| Backup | `/var/backups/fetrack` |
| Cron log | `/home/ubuntu/fetrack-cron.log` |
| Repo | `https://github.com/bionte4/femanager.git` |
| Timezone | `Asia/Jakarta` (WIB) — set dengan `timedatectl` |

**Jangan** expose `:3000` / `:5433` ke publik. Akses hanya lewat Nginx `:80`/`:443`.

---

## 1. Arsitektur

```
Internet
   │
   ▼
Nginx (:443 TLS)  klikhadir.site
   │
   ▼
Next.js PM2 (:3000 loopback)
   ├── Prisma → Postgres PostGIS (Docker, 127.0.0.1:5433)
   ├── Foto → /opt/fetrack/public/uploads/
   ├── Settings WA/SMTP/AI → DB app_settings (+ fallback .env)
   └── crontab → https://klikhadir.site/api/cron/*
```

| Komponen | Production |
|----------|------------|
| App | Next.js 14 (`npm run build` + `pm2`) |
| DB | `postgis/postgis:15-3.4` |
| Proxy | Nginx + Certbot |
| Process | PM2 (`fetrack`) |
| Storage | `public/uploads/` (backup wajib) |
| Channel | Fonnte / SMTP / AI via `/admin/integrations` atau `.env` |

---

## 2. Spesifikasi VPS minimum

| Resource | Soft-launch | Produksi |
|----------|-------------|----------|
| vCPU | 2 | 4+ |
| RAM | 4 GB | 8 GB+ |
| Disk | 40 GB SSD | 80 GB+ |
| OS | Ubuntu 22.04 / 24.04 LTS | sama |

Firewall: `22`, `80`, `443` saja.

---

## 3. Persiapan server (install baru)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw ca-certificates gnupg
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Timezone operasional Indonesia
sudo timedatectl set-timezone Asia/Jakarta
timedatectl
```

### Node 20 · Docker · PM2 · Nginx

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# logout/login atau: newgrp docker
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 4. Clone & environment

```bash
sudo mkdir -p /opt/fetrack
sudo chown $USER:$USER /opt/fetrack
cd /opt
git clone https://github.com/bionte4/femanager.git fetrack
cd fetrack
```

> **Jangan** `git clone` lagi di dalam `/opt/fetrack` (hindari nested `/opt/fetrack/fetrack` yang merusak `next build`).

```bash
cp .env.example .env
nano .env
```

### Env production (wajib)

```env
DATABASE_URL="postgresql://postgres:GANTI_PASSWORD_KUAT@127.0.0.1:5433/fetrack?schema=public"

NEXTAUTH_URL="https://klikhadir.site"
AUTH_SECRET="GANTI_openssl_rand_hex_32"
NEXTAUTH_SECRET="sama_dengan_AUTH_SECRET"

CRON_SECRET="GANTI_cron_secret_panjang"
MONITORING_WEBHOOK_SECRET="GANTI_webhook_secret"

NEXT_PUBLIC_MAPBOX_TOKEN=""
FONNTE_TOKEN=""
ADMIN_WHATSAPP="628xxxxxxxxxx"
STOP_CLOCK_APPROVAL_HOURS="2"
```

```bash
openssl rand -hex 32   # AUTH / CRON / webhook
openssl rand -base64 24  # password DB disarankan
```

`NEXTAUTH_URL` **harus** sama dengan URL browser (HTTPS domain). Salah → login loop / CSS rusak setelah logout.

WA / SMTP / AI juga bisa diisi di UI **`/admin/integrations`** (override DB, fallback `.env`).

---

## 5. Database (Docker PostGIS)

`docker-compose.prod.yml`:

```yaml
services:
  postgres:
    image: postgis/postgis:15-3.4
    container_name: fetrack-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: GANTI_PASSWORD_KUAT
      POSTGRES_DB: fetrack
    ports:
      - "127.0.0.1:5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d fetrack"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

```bash
docker compose -f docker-compose.prod.yml up -d
```

Password compose **=** password di `DATABASE_URL`.  
Volume lama **tidak** ikut ganti password kalau hanya edit compose — pakai `ALTER USER` atau `down -v` (data hilang).

Uji TCP (bukan `docker exec` socket lokal):

```bash
PASS='password_dari_DATABASE_URL'
docker run --rm --network host -e PGPASSWORD="$PASS" postgres:15 \
  psql -h 127.0.0.1 -p 5433 -U postgres -d fetrack -c 'SELECT 1;'
```

Samakan password jika gagal:

```bash
docker exec -it fetrack-postgres \
  psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$PASS';"
```

---

## 6. Install, migrate, build, admin

```bash
cd /opt/fetrack
rm -rf fetrack   # bersihkan nested clone jika ada
npm ci
npx prisma generate
npx prisma migrate deploy
# JANGAN: npx prisma db seed   (production)
npm run build

mkdir -p public/uploads/tickets public/uploads/candidates
chmod -R u+rwX public/uploads
```

### Buat Super Admin (tanpa seed)

```bash
cd /opt/fetrack
ADMIN_PHONE='081234567890' \
ADMIN_PASS='PASSWORD_KUAT_MIN_8' \
ADMIN_NAME='Admin Produksi' \
npx tsx scripts/create-admin.ts
```

Login: `https://klikhadir.site/login` → phone + password di atas.

### Seed demo terbatas (showcase)

Isi data demo cukup untuk presentasi — **bukan** full seed 100 toko:

- SLA, kategori layanan, commission rules
- 2 Mitra + 1 PKWT + agreement
- 5 tenant + device EDC
- Ticket OPEN / ASSIGNED / RESOLVED
- Knowledge Base SOP

```bash
cd /opt/fetrack
SEED_PASSWORD='DemoShow2026!' npx tsx scripts/seed-demo-ops.ts
```

| Akun | Phone | Password |
|------|-------|----------|
| Mitra 1 | `081222222001` | `SEED_PASSWORD` |
| Mitra 2 | `081222222002` | sama |
| PKWT | `081222222003` | sama |

### Reset password

1. **Self-service OTP** — `/forgot-password` (WA Fonnte dan/atau Telegram chat ID engineer)
2. **Admin UI** — Engineers → Edit → Reset password
3. **CLI**:
```bash
RESET_PHONE='081222222001' RESET_PASS='PasswordBaru123' \
  npx tsx scripts/reset-password.ts
```

OTP: 6 digit, berlaku 10 menit, max 3 kirim/jam per nomor.

### Telegram Bot (gratis)

1. Buat bot di `@BotFather` → dapatkan token  
2. Chat bot dari akun admin → buka `https://api.telegram.org/bot<TOKEN>/getUpdates` → salin `chat.id`  
3. `/admin/integrations` → kartu **Telegram Bot** → token + admin chat ID → Test  
4. Opsional: isi **Telegram Chat ID** di Edit Engineer (dispatch/OTP juga ke Telegram)  

Env fallback: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`.

---

## 7. PM2

```bash
cd /opt/fetrack
pm2 start npm --name fetrack -- start
pm2 save
pm2 startup
# jalankan perintah sudo yang ditampilkan PM2

curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login
# harapan: 200
```

---

## 8. Nginx + HTTPS (klikhadir.site)

DNS: A record `@` / `www` → IP VPS.

```nginx
# /etc/nginx/sites-available/fetrack
server {
    listen 80;
    server_name klikhadir.site www.klikhadir.site;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/fetrack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d klikhadir.site -d www.klikhadir.site
```

Pastikan `.env` → `NEXTAUTH_URL="https://klikhadir.site"` lalu `pm2 restart fetrack`.

---

## 9. Crontab (operasional)

Auth: header `Authorization: Bearer <CRON_SECRET>` (sama dengan `.env`).  
**Jangan** buka `/api/cron/*` di browser.

```bash
SECRET=$(grep '^CRON_SECRET=' /opt/fetrack/.env | cut -d= -f2- | tr -d '"' | tr -d "'")

# uji
curl -s -w "\nHTTP:%{http_code}\n" \
  -H "Authorization: Bearer ${SECRET}" \
  "https://klikhadir.site/api/cron/check-dispatch"
```

Pasang:

```bash
SECRET=$(grep '^CRON_SECRET=' /opt/fetrack/.env | cut -d= -f2- | tr -d '"' | tr -d "'")

crontab - <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

* * * * * curl -fsS -H "Authorization: Bearer ${SECRET}" "https://klikhadir.site/api/cron/check-dispatch" >>/home/ubuntu/fetrack-cron.log 2>&1
*/5 * * * * curl -fsS -H "Authorization: Bearer ${SECRET}" "https://klikhadir.site/api/cron/webhook-dlq" >>/home/ubuntu/fetrack-cron.log 2>&1
0 2 * * * curl -fsS -H "Authorization: Bearer ${SECRET}" "https://klikhadir.site/api/cron/expire-contracts" >>/home/ubuntu/fetrack-cron.log 2>&1
0 8 * * * curl -fsS -H "Authorization: Bearer ${SECRET}" "https://klikhadir.site/api/cron/birthday-greetings" >>/home/ubuntu/fetrack-cron.log 2>&1
0 9 * * * curl -fsS -H "Authorization: Bearer ${SECRET}" "https://klikhadir.site/api/cron/remind-contracts" >>/home/ubuntu/fetrack-cron.log 2>&1
0 10 * * * curl -fsS -H "Authorization: Bearer ${SECRET}" "https://klikhadir.site/api/cron/remind-candidates" >>/home/ubuntu/fetrack-cron.log 2>&1
0 3 * * * /usr/local/bin/fetrack-backup.sh >>/var/backups/fetrack/backup.log 2>&1
EOF

touch /home/ubuntu/fetrack-cron.log
crontab -l | sed 's/Bearer .*/Bearer ***/'
```

| Jadwal (WIB) | Endpoint | Fungsi |
|--------------|----------|--------|
| tiap 1 menit | `check-dispatch` | timeout accept / re-dispatch |
| tiap 5 menit | `webhook-dlq` | retry webhook |
| 02:00 | `expire-contracts` | PKWT expired |
| 08:00 | `birthday-greetings` | ucapan ulang tahun WA/Telegram |
| 09:00 | `remind-contracts` | reminder WA kontrak |
| 10:00 | `remind-candidates` | kandidat stale |
| 03:00 | backup script | DB + uploads |

```bash
tail -n 30 /home/ubuntu/fetrack-cron.log
```

---

## 10. Backup (operasional)

```bash
sudo mkdir -p /var/backups/fetrack
sudo chown $USER:$USER /var/backups/fetrack

sudo tee /usr/local/bin/fetrack-backup.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d_%H%M)
DIR=/var/backups/fetrack
mkdir -p "$DIR"

docker exec fetrack-postgres pg_dump -U postgres -d fetrack -Fc \
  > "$DIR/fetrack_$STAMP.dump"

if [ -d /opt/fetrack/public/uploads ]; then
  tar -czf "$DIR/uploads_$STAMP.tgz" -C /opt/fetrack/public uploads
fi

find "$DIR" -type f -mtime +14 -delete
echo "[$(date -Is)] backup ok: fetrack_$STAMP.dump" >> "$DIR/backup.log"
EOF

sudo chmod +x /usr/local/bin/fetrack-backup.sh
/usr/local/bin/fetrack-backup.sh
ls -lh /var/backups/fetrack/
```

Restore:

```bash
docker exec -i fetrack-postgres pg_restore -U postgres -d fetrack --clean --if-exists \
  < /var/backups/fetrack/fetrack_YYYYMMDD_HHMM.dump
```

Disarankan copy dump ke storage luar (bukan hanya disk VPS yang sama).

---

## 11. VPS reboot (auto-start & recovery)

Setelah server reboot (maintenance provider, kernel update, power cycle), layanan **harusnya naik sendiri** jika setup awal sudah benar. Bagian ini = checklist verifikasi + perbaikan jika ada yang tidak naik.

### Apa yang auto-start (harapan)

| Layanan | Mekanisme | Syarat sudah di-set |
|---------|-----------|---------------------|
| Docker daemon | `systemd` | `sudo systemctl enable docker` |
| Container Postgres | `restart: unless-stopped` | compose pernah `up -d` |
| Nginx | `systemd` | `sudo systemctl enable nginx` |
| Next.js (`fetrack`) | PM2 resurrect | `pm2 save` + `pm2 startup` (jalankan perintah `sudo` yang dicetak) |
| Crontab cron jobs | crontab user | `crontab -l` sudah terisi (persist otomatis) |
| Certbot renew | systemd timer | terpasang saat `certbot --nginx` |
| Backup 03:00 | crontab | script `/usr/local/bin/fetrack-backup.sh` |

Timezone tetap `Asia/Jakarta` (persist di OS). Data DB di volume Docker `postgres_data` **tidak hilang** karena reboot.

### One-time: pastikan survive reboot

Jalankan sekali (atau setelah recreate VPS):

```bash
# Systemd
sudo systemctl enable --now docker
sudo systemctl enable --now nginx

# Docker Postgres (path compose di VPS)
cd /opt/fetrack
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
# Pastikan di YAML: restart: unless-stopped

# PM2 auto-start setelah reboot
cd /opt/fetrack
pm2 start npm --name fetrack -- start   # jika belum ada
pm2 save
pm2 startup
# WAJIB copy-paste & jalankan baris `sudo env PATH=...` yang dicetak PM2
sudo systemctl daemon-reload
sudo systemctl enable pm2-$(whoami)     # nama unit biasanya pm2-ubuntu

# Verifikasi unit
systemctl is-enabled docker nginx
systemctl is-enabled "pm2-$(whoami)" || systemctl list-unit-files | grep pm2
crontab -l | head
```

Tanpa `pm2 save` + `pm2 startup` (sudo), setelah reboot **app Next.js mati** meski Docker/Nginx hidup → Nginx 502.

### Checklist setelah reboot (5 menit)

SSH ke VPS, lalu:

```bash
# 1) OS & waktu
uptime
timedatectl   # Asia/Jakarta

# 2) Docker + DB
sudo systemctl status docker --no-pager | head -15
docker ps --filter name=fetrack-postgres
# Jika kosong:
cd /opt/fetrack && docker compose -f docker-compose.prod.yml up -d
# Tunggu sehat:
until docker exec fetrack-postgres pg_isready -U postgres -d fetrack; do sleep 2; done

# 3) App PM2
pm2 status
# Jika list kosong / stopped:
pm2 resurrect
# atau:
cd /opt/fetrack && pm2 start npm --name fetrack -- start && pm2 save
curl -s -o /dev/null -w "app:%{http_code}\n" http://127.0.0.1:3000/login

# 4) Nginx + HTTPS publik
sudo systemctl status nginx --no-pager | head -10
curl -s -o /dev/null -w "https:%{http_code}\n" https://klikhadir.site/login
# harapan: 200

# 5) Cron masih ada
crontab -l | sed 's/Bearer .*/Bearer ***/'
```

Smoke UI: buka `https://klikhadir.site/login` → login admin.

### Urutan recovery jika 502 / DB down

Postgres harus hidup **sebelum** Next.js/Prisma stabil.

```bash
cd /opt/fetrack

# A. DB dulu
sudo systemctl start docker
docker compose -f docker-compose.prod.yml up -d
until docker exec fetrack-postgres pg_isready -U postgres -d fetrack; do sleep 2; done

# B. App
pm2 resurrect || pm2 start npm --name fetrack -- start
pm2 save
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login

# C. Proxy
sudo systemctl start nginx
sudo nginx -t && sudo systemctl reload nginx
curl -s -o /dev/null -w "%{http_code}\n" https://klikhadir.site/login
```

### Gejala khas pasca-reboot

| Gejala | Penyebab umum | Perbaikan |
|--------|---------------|-----------|
| 502 Bad Gateway | PM2 belum resurrect | `pm2 resurrect` atau start ulang + `pm2 save` |
| PM2 empty setelah reboot | Belum `pm2 startup` / belum `save` | Jalankan setup one-time di atas |
| Prisma / login error DB | Postgres belum ready | Tunggu `pg_isready`, lalu `pm2 restart fetrack` |
| `docker: permission denied` | Session baru / group docker | `newgrp docker` atau login SSH ulang |
| Cron diam | Crontab user hilang (jarang) | Pasang ulang dari §9 |
| HTTPS gagal, HTTP OK | Nginx/cert timer | `sudo systemctl start nginx`; `sudo certbot renew --dry-run` |

### Reboot terjadwal (opsional)

```bash
# Sebelum reboot (opsional — kurangi crash mid-write)
pm2 stop fetrack
docker compose -f /opt/fetrack/docker-compose.prod.yml stop

sudo reboot

# Setelah up: ikuti checklist di atas (compose up + pm2 resurrect biasanya otomatis)
```

---

## 12. Runbook harian / kejadian

### Status cepat

```bash
pm2 status
docker compose -f /opt/fetrack/docker-compose.prod.yml ps
curl -s -o /dev/null -w "%{http_code}\n" https://klikhadir.site/login
tail -n 20 /home/ubuntu/fetrack-cron.log
ls -lt /var/backups/fetrack | head
```

### Redeploy (update kode)

```bash
cd /opt/fetrack
git pull origin main
rm -rf fetrack   # jika sempat nested clone
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build          # wajib sukses sebelum restart
pm2 restart fetrack
pm2 logs fetrack --lines 30
```

**Jangan** hapus `public/uploads/`.  
**Jangan** `pm2 restart` jika `npm run build` gagal.

Setelah ubah `.env`:

```bash
pm2 restart fetrack --update-env
```

### Reset password admin

```bash
ADMIN_PHONE='081234567890' ADMIN_PASS='PASSWORD_BARU' \
  npx tsx scripts/create-admin.ts
```

### Integrasi channel

UI: `https://klikhadir.site/admin/integrations` (kartu WA / SMTP / AI + Customer Open API).

---

## 13. Checklist go-live / audit

- [ ] DNS → VPS; HTTPS Certbot aktif
- [ ] `NEXTAUTH_URL=https://klikhadir.site`
- [ ] Secret kuat (AUTH, CRON, webhook, DB)
- [ ] Postgres bind `127.0.0.1` saja
- [ ] `migrate deploy` OK; **tanpa** seed production
- [ ] Super Admin via `scripts/create-admin.ts`
- [ ] PM2 `startup` + `save` (**wajib** agar survive reboot)
- [ ] `systemctl enable docker nginx` + Postgres `restart: unless-stopped`
- [ ] Uji simulasi: `sudo reboot` → checklist §11 (HTTPS 200, PM2 online, cron ada)
- [ ] Crontab 6 job (+ birthday 08:00) + backup 03:00
- [ ] Timezone `Asia/Jakarta`
- [ ] UFW 22/80/443
- [ ] Smoke: login, logout → `/login`, ticket, upload, cron HTTP 200
- [ ] Tidak ada nested `/opt/fetrack/fetrack`

---

## 14. Troubleshooting operasional

| Gejala | Perbaikan |
|--------|-----------|
| Setelah reboot 502 | PM2 tidak auto-start — lihat §11; `pm2 resurrect` / `pm2 startup` |
| Setelah reboot DB refused | Tunggu Docker/Postgres; `compose up -d` lalu `pm2 restart fetrack` |
| Nginx 404 di `:3000` publik | Jangan expose 3000; pakai `https://klikhadir.site` via Nginx |
| 502 Bad Gateway | `pm2 status`; app di `:3000`; `nginx -t` |
| Login loop / session hilang | Samakan `NEXTAUTH_URL` dengan URL browser; restart PM2 |
| Logout tampilan tanpa CSS | Hard redirect sudah di kode terbaru; pull + rebuild; cek `NEXTAUTH_URL` |
| Prisma P1000 auth failed | Password `.env` ≠ volume Docker; `ALTER USER` atau reset volume |
| `prisma.appSetting` undefined / hang | `npx prisma generate` + **restart** `pm2` (bukan HMR) |
| Build `./fetrack/lib/...` | Hapus nested `rm -rf /opt/fetrack/fetrack` |
| Build REJECT_REASONS / use server | Pastikan pull commit terbaru |
| Cron 401 | Secret crontab ≠ `.env`; jangan pakai placeholder; `pm2 restart` setelah ubah env |
| Cron log kosong | `crontab -l`; `touch` log; tunggu 1 menit; cek `curl` manual |
| Docker permission denied | `sudo usermod -aG docker $USER` lalu `newgrp docker` |
| Foto hilang | Restore `uploads_*.tgz`; jangan hapus `public/uploads` saat deploy |
| WA tidak kirim | Token kosong / disabled di Integrations; cek log PM2 |

Log:

```bash
pm2 logs fetrack --lines 80
sudo journalctl -u nginx -n 50
docker logs fetrack-postgres --tail 50
tail -n 50 /home/ubuntu/fetrack-cron.log
tail -n 20 /var/backups/fetrack/backup.log
```

---

## 15. Keamanan

1. SSH key-only bila memungkinkan.
2. Jangan commit `.env`.
3. Jangan buka `5433` / `9000` ke `0.0.0.0`.
4. Jangan seed production; buat admin dengan password kuat.
5. Opsional: IP allowlist untuk `/admin` di Nginx.
6. Jangan upgrade Prisma major (5 → 8) tanpa rencana migrasi.

---

## 16. Referensi cepat

```bash
# Status
pm2 status
docker ps --filter name=fetrack-postgres
curl -s -o /dev/null -w "%{http_code}\n" https://klikhadir.site/login

# Restart
pm2 restart fetrack

# Deploy singkat (setelah pull)
cd /opt/fetrack && npx prisma migrate deploy && npm run build && pm2 restart fetrack

# SSL renew dry-run
sudo certbot renew --dry-run

# Backup manual
/usr/local/bin/fetrack-backup.sh

# Pasca-reboot (lihat §11)
docker ps --filter name=fetrack-postgres
pm2 status
pm2 resurrect   # jika list kosong
curl -s -o /dev/null -w "%{http_code}\n" https://klikhadir.site/login
```
