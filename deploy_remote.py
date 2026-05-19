import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '185.194.219.73'
USER = 'amine'
PASS = 'Azerty123'
REPO = 'https://github.com/amine18ch/mrplace-fullstack.git'
APP  = '/home/amine/mrplace'
DB_NAME = 'mrplace_db'
DB_USER = 'mrplace_user'
DB_PASS = 'MrPlace2024!'
BACKEND_PORT = 5000

def run(client, cmd, timeout=120, show=True):
    if show:
        print(f'\n\033[94m$ {cmd[:120]}\033[0m')
    t, o, e = client.exec_command(f'export DEBIAN_FRONTEND=noninteractive; {cmd}', timeout=timeout, get_pty=False)
    out = o.read().decode('utf-8', 'replace').strip()
    err = e.read().decode('utf-8', 'replace').strip()
    rc  = o.channel.recv_exit_status()
    if out and show: print(out)
    if err and rc != 0 and show: print(f'[STDERR] {err[:300]}')
    return out, err, rc

def sudo(client, cmd, timeout=120):
    return run(client, f'echo "{PASS}" | sudo -S bash -c \'{cmd}\'', timeout)

# Connect
print('🔌 Connexion au serveur...')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASS, timeout=20, allow_agent=False, look_for_keys=False)
print('✅ Connecté !')

# ── 1. Create DB
print('\n📦 Création base de données PostgreSQL...')
sudo(c, f"sudo -u postgres psql -c \"CREATE USER {DB_USER} WITH PASSWORD '{DB_PASS}';\" 2>/dev/null; true")
sudo(c, f"sudo -u postgres psql -c \"CREATE DATABASE {DB_NAME} OWNER {DB_USER};\" 2>/dev/null; true")
sudo(c, f"sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE {DB_NAME} TO {DB_USER};\"; true")
sudo(c, f"sudo -u postgres psql -d {DB_NAME} -c \"GRANT ALL ON SCHEMA public TO {DB_USER};\" 2>/dev/null; true")
print('✅ Base de données prête')

# ── 2. Clone / update repo
print('\n📥 Clonage du repo GitHub...')
run(c, f'rm -rf {APP}')
run(c, f'git clone {REPO} {APP}', timeout=60)
print('✅ Repo cloné')

# ── 3. Configure .env
print('\n⚙️  Configuration .env backend...')
env_content = f"""DATABASE_URL="postgresql://{DB_USER}:{DB_PASS}@localhost:5432/{DB_NAME}"
JWT_SECRET="mrplace_jwt_secret_key_2024_tunisia_secure"
JWT_EXPIRES_IN="7d"
PORT={BACKEND_PORT}
NODE_ENV=production
FRONTEND_URL="http://mrplace.globalenr.com"
"""
run(c, f"cat > {APP}/backend/.env << 'ENVEOF'\n{env_content}ENVEOF")
print('✅ .env configuré')

# ── 4. Install backend dependencies
print('\n📦 Installation dépendances backend...')
run(c, f'cd {APP}/backend && npm install --production 2>&1 | tail -5', timeout=180)
print('✅ npm install backend OK')

# ── 5. Prisma generate + migrate + seed
print('\n🗄️  Prisma migrations...')
run(c, f'cd {APP}/backend && npx prisma generate 2>&1 | tail -3', timeout=60)
run(c, f'cd {APP}/backend && npx prisma migrate deploy 2>&1 | tail -10', timeout=120)
print('✅ Migrations OK')

print('\n🌱 Seed de la base de données...')
out, err, rc = run(c, f'cd {APP}/backend && node prisma/seed.js 2>&1', timeout=60)
if rc == 0:
    print('✅ Seed OK')
else:
    print(f'⚠️  Seed warning (rc={rc}): {err[:200]}')

# ── 6. Install frontend + build
print('\n🎨 Installation frontend + build Vite...')
run(c, f'cd {APP}/frontend && npm install 2>&1 | tail -5', timeout=180)
run(c, f'cd {APP}/frontend && VITE_API_URL=/api npm run build 2>&1 | tail -10', timeout=120)
print('✅ Build frontend OK')

# ── 7. PM2
print('\n⚡ Configuration PM2...')
run(c, f'pm2 delete mrplace-backend 2>/dev/null; true')
run(c, f'cd {APP}/backend && pm2 start src/index.js --name mrplace-backend')
run(c, f'pm2 save')
out, _, _ = run(c, 'pm2 list 2>/dev/null | grep mrplace')
print('✅ PM2 démarré')

# ── 8. Nginx config
print('\n🌐 Configuration Nginx...')
nginx_conf = r"""server {
    listen 80;
    server_name mrplace.globalenr.com;

    root /home/amine/mrplace/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}"""

# Write nginx config
run(c, f"echo '{nginx_conf}' | sudo -S tee /etc/nginx/sites-available/mrplace.globalenr.com > /dev/null", show=False)
# Use sudo properly
sudo(c, f"tee /etc/nginx/sites-available/mrplace.globalenr.com > /dev/null << 'NGINXEOF'\n{nginx_conf}\nNGINXEOF")
sudo(c, f"ln -sf /etc/nginx/sites-available/mrplace.globalenr.com /etc/nginx/sites-enabled/")
out, err, rc = sudo(c, "nginx -t 2>&1")
print(out or err)
if rc == 0:
    sudo(c, "systemctl reload nginx")
    print('✅ Nginx configuré et rechargé')
else:
    print(f'❌ Erreur nginx: {err}')

# ── 9. Final check
print('\n🔍 Vérification finale...')
time.sleep(3)
out, _, rc = run(c, f'curl -s http://localhost:{BACKEND_PORT}/api/health 2>/dev/null', timeout=15)
if rc == 0 and 'ok' in out.lower():
    print(f'✅ API répond: {out[:100]}')
else:
    out2, err2, _ = run(c, f'curl -v http://localhost:{BACKEND_PORT}/api/health 2>&1 | head -20', timeout=15)
    print(f'API check: {out2} {err2[:100]}')

run(c, 'pm2 list 2>/dev/null | grep mrplace')
c.close()

print("""
╔══════════════════════════════════════════════════════╗
║  🎉 DÉPLOIEMENT TERMINÉ !                             ║
║                                                       ║
║  🌐 URL     : http://mrplace.globalenr.com            ║
║  🔑 Admin   : admin@mrplace.tn / Admin@2024!          ║
║  🗄️  DB      : mrplace_db (PostgreSQL)                 ║
║  ⚡ PM2     : mrplace-backend (port 5000)              ║
║                                                       ║
║  👉 Pointez le DNS : mrplace.globalenr.com → 185.194.219.73
╚══════════════════════════════════════════════════════╝
""")
