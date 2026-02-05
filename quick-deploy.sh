#!/bin/bash
cd /var/www/admin_page
git add .
git commit -m "Connect frontend to real-time API - display actual server data"
git push
npm run build
systemctl reload nginx
echo "Deployment complete!"
