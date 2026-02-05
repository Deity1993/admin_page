#!/bin/bash

# Admin Page Deployment Script für Ubuntu Server
# Dieses Script deployt die Admin-Seite auf einem Ubuntu Server

set -e  # Beenden bei Fehlern

echo "=================================="
echo "Admin Page Deployment Script"
echo "=================================="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Konfiguration
APP_NAME="admin_page"
APP_DIR="/var/www/$APP_NAME"
NGINX_AVAILABLE="/etc/nginx/sites-available/$APP_NAME"
NGINX_ENABLED="/etc/nginx/sites-enabled/$APP_NAME"
SERVICE_FILE="/etc/systemd/system/admin-page.service"

# Funktion für farbige Ausgaben
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Root-Rechte prüfen
if [ "$EUID" -ne 0 ]; then 
    print_error "Bitte als root ausführen (sudo ./deploy.sh)"
    exit 1
fi

# 1. Systemupdates und Abhängigkeiten installieren
print_info "Installiere System-Abhängigkeiten..."
apt update
apt install -y nginx nodejs npm git curl

# Node.js Version prüfen
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js Version ist älter als 18. Installiere neuere Version..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# 2. Anwendungsverzeichnis erstellen
print_info "Erstelle Anwendungsverzeichnis: $APP_DIR"
mkdir -p "$APP_DIR"

# 3. Dateien kopieren
print_info "Kopiere Anwendungsdateien..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp -r "$SCRIPT_DIR"/* "$APP_DIR/"
cd "$APP_DIR"

# 4. .env.production erstellen (falls nicht vorhanden)
if [ ! -f "$APP_DIR/.env.production" ]; then
    print_warning ".env.production nicht gefunden. Erstelle Template..."
    cat > "$APP_DIR/.env.production" << EOF
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
EOF
    print_warning "WICHTIG: Bitte bearbeiten Sie $APP_DIR/.env.production und fügen Sie Ihren API-Key ein!"
fi

# 5. npm Abhängigkeiten installieren
print_info "Installiere npm Abhängigkeiten..."
npm install

# 6. Build der Anwendung
print_info "Baue Produktionsversion..."
npm run build

# 7. Berechtigungen setzen
print_info "Setze Berechtigungen..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# 8. nginx konfigurieren
print_info "Konfiguriere nginx..."
if [ -f "$SCRIPT_DIR/nginx.conf" ]; then
    cp "$SCRIPT_DIR/nginx.conf" "$NGINX_AVAILABLE"
    
    # Symlink erstellen falls nicht vorhanden
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    fi
    
    # nginx Konfiguration testen
    nginx -t
    
    # nginx neu laden
    systemctl reload nginx
    print_info "nginx konfiguriert und neu geladen"
else
    print_warning "nginx.conf nicht gefunden. Bitte manuell konfigurieren."
fi

# 9. Systemd Service einrichten (optional - nur wenn Sie vite preview nutzen möchten)
print_info "Möchten Sie die App auch mit systemd Service laufen lassen? (j/n)"
read -r SETUP_SERVICE

if [ "$SETUP_SERVICE" = "j" ] || [ "$SETUP_SERVICE" = "J" ]; then
    if [ -f "$SCRIPT_DIR/admin-page.service" ]; then
        cp "$SCRIPT_DIR/admin-page.service" "$SERVICE_FILE"
        systemctl daemon-reload
        systemctl enable admin-page.service
        systemctl start admin-page.service
        print_info "Systemd Service eingerichtet und gestartet"
    else
        print_warning "admin-page.service nicht gefunden"
    fi
fi

# 10. Firewall konfigurieren (falls ufw aktiv)
if command -v ufw &> /dev/null; then
    print_info "Konfiguriere Firewall (ufw)..."
    ufw allow 'Nginx Full'
    print_info "Firewall konfiguriert"
fi

# 11. Status anzeigen
echo ""
echo "=================================="
print_info "Deployment abgeschlossen!"
echo "=================================="
echo ""
print_info "Nächste Schritte:"
echo "1. Bearbeiten Sie $APP_DIR/.env.production mit Ihrem Gemini API-Key"
echo "2. Passen Sie $NGINX_AVAILABLE an (Domain-Name)"
echo "3. Für HTTPS: Installieren Sie Let's Encrypt mit certbot"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d ihre-domain.com"
echo ""
print_info "Die Anwendung sollte nun unter http://$(hostname -I | awk '{print $1}') erreichbar sein"
echo ""

# Nginx Status
systemctl status nginx --no-pager | head -5

# Optional: Service Status
if systemctl is-active --quiet admin-page.service; then
    echo ""
    systemctl status admin-page.service --no-pager | head -5
fi
