#!/bin/bash
# Script de déploiement MrPlace — serveur 185.194.219.73
# Usage: ./deploy.sh

set -e
SERVER="root@185.194.219.73"
APP_DIR="/var/www/mrplace"
DB_NAME="mrplace_db"
DB_USER="mrplace_user"
DB_PASS="MrPlace2024!"
BACKEND_PORT=5000
FRONTEND_PORT=5001

echo "🚀 Déploiement MrPlace sur $SERVER..."

ssh $SERVER << ENDSSH
  set -e

  # ---------- 1. Créer base de données ----------
  echo "📦 Création base de données..."
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
  echo "✅ Base de données prête"

  # ---------- 2. Cloner / mettre à jour le repo ----------
  echo "📥 Clonage du repo..."
  if [ -d "$APP_DIR" ]; then
    cd $APP_DIR && git pull origin master
  else
    git clone https://github.com/amine18ch/mrplace.git $APP_DIR
  fi

  # ---------- 3. Backend ----------
  echo "⚙️  Installation backend..."
  cd $APP_DIR/backend
  cp .env.example .env
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME\"|" .env
  sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=\"http://mrplace.globalenr.com\"|" .env
  npm install --production
  npx prisma generate
  npx prisma migrate deploy
  node prisma/seed.js
  echo "✅ Backend configuré"

  # ---------- 4. Frontend ----------
  echo "🎨 Build frontend..."
  cd $APP_DIR/frontend
  npm install
  VITE_API_URL=/api npm run build
  echo "✅ Frontend buildé"

  # ---------- 5. PM2 ----------
  echo "⚡ Configuration PM2..."
  pm2 delete mrplace-backend 2>/dev/null || true
  cd $APP_DIR/backend
  pm2 start src/index.js --name mrplace-backend
  pm2 save
  echo "✅ PM2 configuré"

  # ---------- 6. Nginx ----------
  echo "🌐 Configuration Nginx..."
  cat > /etc/nginx/sites-available/mrplace.globalenr.com << 'EOF'
server {
    listen 80;
    server_name mrplace.globalenr.com;

    # Frontend (fichiers statiques buildés)
    root /var/www/mrplace/frontend/dist;
    index index.html;

    # API backend — proxy vers Express
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    # SPA fallback — toutes les routes → index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache fichiers statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

  ln -sf /etc/nginx/sites-available/mrplace.globalenr.com /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  echo "✅ Nginx configuré"

  echo ""
  echo "🎉 DÉPLOIEMENT TERMINÉ !"
  echo "🌐 URL: http://mrplace.globalenr.com"
  echo "🔑 Admin: admin@mrplace.tn / Admin@2024!"
  echo ""
ENDSSH

echo "✅ Script terminé. Pointez mrplace.globalenr.com → 185.194.219.73 dans votre DNS."
