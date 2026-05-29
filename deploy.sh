#!/bin/bash
set -e
cd /home/amine/mrplace
git pull origin master
cd backend
npx prisma db push --accept-data-loss
cd ../frontend
npm install
npm run build
cd ..
pm2 restart mrplace-backend
pm2 status
echo "Deploy complete!"
