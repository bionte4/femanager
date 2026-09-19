# FE-Track — Deployment di VPS

Panduan deploy production di VPS (Ubuntu 22.04/24.04 LTS).  
Stack yang disarankan: **Docker (Postgres PostGIS + MinIO opsional)** · **Node 20** · **PM2** · **Nginx** · **Let's Encrypt**.

Dokumen terkait: [MANUAL_GUIDE.md](./MANUAL_GUIDE.md) · [ENGAGEMENT.md](./ENGAGEMENT.md) · [README.md](../README.md)

---

## 1. Arsitektur production

```
Internet
   │
   ▼
Nginx (:443 TLS)  ──►  Next.js PM2 (:3000)
                           │
                           ├── Prisma → Postgres PostGIS (Docker :5432 internal / :5433 host)
                           ├── Foto lokal → public/uploads/  (persist volume)
                           └── Cron (crontab) → https://domain/api/cron/*
```

| Komponen | Rekomendasi |
|----------|-------------|
| App | Next.js 14 (`npm run build` + `pm2`) |
| DB | `postgis/postgis:15-3.4` via Docker |
| Reverse proxy | Nginx + Certbot |
| Process manager | PM2 |
| Storage foto | Saat ini **filesystem** `public/uploads/` (backup wajib) |
| WA / Mapbox / FCM | Opsional via env |

---

## 2. Spesifikasi VPS minimum

| Resource | Dev / soft-launch | Produksi (nasional) |
|----------|-------------------|---------------------|
| vCPU | 2 | 4+ |
| RAM | 4 GB | 8 GB+ |
| Disk | 40 GB SSD | 80 GB+ SSD |
| OS | Ubuntu 22.04 / 24.04 LTS | sama |
| Network | Public IP + domain A record | sama |

Buka firewall: `22` (SSH), `80`, `443`. **Jangan** expose Postgres/MinIO ke publik.

---

## 3. Persiapan server

```bash
# Login sebagai user non-root dengan sudo
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw ca-certificates gnupg

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v
```

### Docker + Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# logout/login agar group docker aktif
docker --version
docker compose version
```

### PM2 & Nginx & Certbot

```bash
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 4. Clone & environment

App di **`/opt/fetrack`** (standar binary/service di Linux; backup tetap di `/var/backups`).

```bash
sudo mkdir -p /opt/fetrack
sudo chown $USER:$USER /opt/fetrack
cd /opt
git clone https://github.com/bionte4/femanager.git fetrack
cd fetrack
```

Buat `.env` production (jangan commit):

```bash
cp .env.example .env
nano .env
```

### Env production (wajib)

```env
# DB — host dari container (lihat docker-compose di bawah)
DATABASE_URL="postgresql://postgres:GANTI_PASSWORD_KUAT@127.0.0.1:5433/fetrack?schema=public"

# Auth — URL harus HTTPS domain production
NEXTAUTH_URL="https://app.contoh.com"
AUTH_SECRET="GANTI_dengan_openssl_rand_hex_32"
NEXTAUTH_SECRET="sama_dengan_AUTH_SECRET"

# Cron & webhook — fail-closed tanpa secret
CRON_SECRET="GANTI_cron_secret_panjang"
MONITORING_WEBHOOK_SECRET="GANTI_webhook_secret"

# Opsional
NEXT_PUBLIC_MAPBOX_TOKEN=""
FONNTE_TOKEN=""
ADMIN_WHATSAPP="628xxxxxxxxxx"
STOP_CLOCK_APPROVAL_HOURS="2"

# FCM (opsional)
FCM_SERVER_KEY=""
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_VAPID_KEY=""
```

Generate secret:

```bash
openssl rand -hex 32
```

---

## 5. Database (Docker PostGIS)

Di VPS, **jangan** publish Postgres ke internet. Gunakan `docker-compose.prod.yml` minimal:

```bash
nano docker-compose.prod.yml
```

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

Jalankan:

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

> Password di compose **harus sama** dengan `DATABASE_URL`.

---

## 6. Install app, migrate, build

```bash
cd /opt/fetrack
npm ci
npx prisma generate
npx prisma migrate deploy

# Seed HANYA untuk staging/demo — JANGAN di production live
# npx prisma db seed

npm run build
```

Buat folder upload persistent:

```bash
mkdir -p public/uploads/tickets public/uploads/candidates
chmod -R u+rwX public/uploads
```

Buat user admin production lewat Prisma Studio / SQL / script — **ganti password seed** jika sempat seed di staging.

---

## 7. Jalankan dengan PM2

```bash
cd /opt/fetrack
pm2 start npm --name fetrack -- start
pm2 save
pm2 startup
# ikuti perintah yang ditampilkan (sudo env PATH=...)
```

Cek:

```bash
pm2 status
pm2 logs fetrack --lines 50
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login
```

### File ecosystem (opsional)

`ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: "fetrack",
      cwd: "/opt/fetrack",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "1G",
    },
  ],
};
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 8. Nginx + HTTPS

```bash
sudo nano /etc/nginx/sites-available/fetrack
```

```nginx
server {
    listen 80;
    server_name app.contoh.com;

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
sudo nginx -t
sudo systemctl reload nginx

# Pastikan DNS A record domain → IP VPS sudah aktif
sudo certbot --nginx -d app.contoh.com
```

Setelah SSL, pastikan `NEXTAUTH_URL=https://app.contoh.com` lalu:

```bash
pm2 restart fetrack
```

---

## 9. Cron production

Auth: `Authorization: Bearer <CRON_SECRET>`

```bash
crontab -e
```

```cron
# FE-Track — ganti DOMAIN dan CRON_SECRET
* * * * * curl -fsS -H "Authorization: Bearer CRON_SECRET" "https://app.contoh.com/api/cron/check-dispatch" >/dev/null 2>&1
*/5 * * * * curl -fsS -H "Authorization: Bearer CRON_SECRET" "https://app.contoh.com/api/cron/webhook-dlq" >/dev/null 2>&1
0 2 * * * curl -fsS -H "Authorization: Bearer CRON_SECRET" "https://app.contoh.com/api/cron/expire-contracts" >/dev/null 2>&1
0 9 * * * curl -fsS -H "Authorization: Bearer CRON_SECRET" "https://app.contoh.com/api/cron/remind-contracts" >/dev/null 2>&1
0 10 * * * curl -fsS -H "Authorization: Bearer CRON_SECRET" "https://app.contoh.com/api/cron/remind-candidates" >/dev/null 2>&1
```

Uji manual:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://app.contoh.com/api/cron/check-dispatch"
```

---

## 10. Backup

### Postgres (harian)

```bash
mkdir -p /var/backups/fetrack
nano /usr/local/bin/fetrack-backup.sh
```

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d_%H%M)
DIR=/var/backups/fetrack
mkdir -p "$DIR"
docker exec fetrack-postgres pg_dump -U postgres -d fetrack -Fc \
  > "$DIR/fetrack_$STAMP.dump"
# Upload lokal (persist foto)
tar -czf "$DIR/uploads_$STAMP.tgz" -C /opt/fetrack/public uploads
# Retensi 14 hari
find "$DIR" -type f -mtime +14 -delete
```

```bash
sudo chmod +x /usr/local/bin/fetrack-backup.sh
# crontab root atau user:
0 3 * * * /usr/local/bin/fetrack-backup.sh
```

Restore contoh:

```bash
docker exec -i fetrack-postgres pg_restore -U postgres -d fetrack --clean --if-exists < fetrack_YYYYMMDD.dump
```

---

## 11. Update / redeploy

```bash
cd /opt/fetrack
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart fetrack
pm2 logs fetrack --lines 30
```

**Jangan** hapus `public/uploads/` saat deploy.  
Jika build gagal, PM2 masih menjalankan build lama sampai `restart` sukses.

Zero-downtime ringan (opsional):

```bash
npm run build && pm2 reload fetrack
```

---

## 12. Checklist go-live VPS

- [ ] DNS A record mengarah ke VPS
- [ ] HTTPS aktif (`certbot`)
- [ ] `NEXTAUTH_URL` = `https://...` (bukan localhost)
- [ ] Secret kuat: `AUTH_SECRET`, `CRON_SECRET`, `MONITORING_WEBHOOK_SECRET`, DB password
- [ ] Postgres hanya bind `127.0.0.1`
- [ ] `migrate deploy` sukses; **tanpa** seed production (atau ganti semua password)
- [ ] PM2 `startup` + `save`
- [ ] Crontab 4–5 job cron jalan
- [ ] Backup DB + `uploads` terjadwal
- [ ] UFW: 22/80/443 saja
- [ ] Uji login admin + engineer, upload foto, assign ticket, cron 200
- [ ] Inbox HR kontrak + payroll Mitra dicek

---

## 13. Troubleshooting VPS

| Gejala | Cek |
|--------|-----|
| 502 Bad Gateway | `pm2 status`; app listen `:3000`; `nginx -t` |
| Login loop / session hilang | `NEXTAUTH_URL` harus HTTPS domain yang sama; cookie Secure |
| Prisma error / table missing | `npx prisma migrate deploy` |
| Cron 401 | `CRON_SECRET` di `.env` vs crontab tidak match; restart PM2 setelah ubah env |
| Foto hilang setelah deploy | `public/uploads` terhapus — restore dari backup |
| Disk penuh | `du -sh public/uploads /var/lib/docker`; bersihkan backup lama |
| OOM / restart | Naikkan RAM atau `max_memory_restart`; cek `pm2 monit` |
| WA tidak kirim | `FONNTE_TOKEN` kosong = skip (lihat log); set token lalu restart |

Log berguna:

```bash
pm2 logs fetrack
sudo journalctl -u nginx -n 50
docker logs fetrack-postgres --tail 50
```

---

## 14. Keamanan singkat

1. SSH key-only; disable password login jika memungkinkan.
2. Jangan commit `.env`.
3. Jangan buka port `5433` / `9000` ke `0.0.0.0`.
4. Ganti semua kredensial seed sebelum traffic nyata.
5. Batasi akses `/admin` dengan VPN atau IP allowlist (opsional di Nginx).

Contoh allowlist admin (opsional):

```nginx
location /admin {
    # allow 203.0.113.10;
    # deny all;
    proxy_pass http://127.0.0.1:3000;
    # ... header sama seperti di atas
}
```

---

## 15. Referensi cepat perintah

```bash
# Status
pm2 status && docker compose -f docker-compose.prod.yml ps

# Restart app
pm2 restart fetrack

# Migrate setelah pull
npx prisma migrate deploy && npm run build && pm2 restart fetrack

# SSL renew (biasanya auto via certbot timer)
sudo certbot renew --dry-run
```
