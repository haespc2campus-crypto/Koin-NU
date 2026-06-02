# Deploy Rizquna VPS

## 1. Upload project

```bash
cd /var/www
sudo mkdir -p sikoinnu
sudo chown -R $USER:$USER sikoinnu
cd sikoinnu
# git clone / upload source di sini
npm ci
```

## 2. PostgreSQL

```bash
sudo -u postgres psql
```

```sql
create database koin_nu;
create user koin_nu_user with encrypted password 'GANTI_PASSWORD_KUAT';
grant all privileges on database koin_nu to koin_nu_user;
\c koin_nu
create schema if not exists public authorization koin_nu_user;
grant all on schema public to koin_nu_user;
```

## 3. Environment

```bash
cp .env.example .env
nano .env
```

```env
PORT=5173
DATABASE_URL=postgres://koin_nu_user:GANTI_PASSWORD_KUAT@localhost:5432/koin_nu
UPLOADS_DIR=uploads
SESSION_TTL_MS=43200000
MAX_BODY_BYTES=2097152
```

Cek DB:

```bash
npm run db:check
npm run seed:admin -- admin@domain.id passwordKuat "Admin"
```

## 4. Validasi app

```bash
npm run lint
npm run test:smoke
npm run build
```

## 5. systemd service

```bash
sudo nano /etc/systemd/system/sikoinnu.service
```

```ini
[Unit]
Description=SIKOINNU Node App
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/sikoinnu
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Permission:

```bash
sudo chown -R www-data:www-data /var/www/sikoinnu
sudo systemctl daemon-reload
sudo systemctl enable --now sikoinnu
sudo systemctl status sikoinnu
```

## 6. Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/sikoinnu
```

```nginx
server {
    server_name DOMAIN_ANDA;

    client_max_body_size 3m;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sikoinnu /etc/nginx/sites-enabled/sikoinnu
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS

```bash
sudo certbot --nginx -d DOMAIN_ANDA
```

## 8. Healthcheck

```bash
curl http://127.0.0.1:5173/api/health
curl https://DOMAIN_ANDA/api/health
```

Expected:

```json
{"ok":true,"database":"postgresql","time":"..."}
```

## 9. Backup PostgreSQL

Manual:

```bash
pg_dump "$DATABASE_URL" > backup-koin-nu-$(date +%F).sql
```

Cron harian contoh:

```bash
0 2 * * * pg_dump 'postgres://koin_nu_user:GANTI_PASSWORD_KUAT@localhost:5432/koin_nu' > /var/backups/koin-nu-$(date +\%F).sql
```
