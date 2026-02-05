#!/bin/bash

# Admin Page Git-basiertes Deployment Script für Ubuntu Server
# Dieses Script clont/aktualisiert das Repository und deployt die Anwendung

set -e  # Beenden bei Fehlern

echo "=================================="
echo "Admin Page Git Deployment Script"
echo "=================================="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Konfiguration - ANPASSEN!
GIT_REPO="https://github.com/IhrUsername/admin_page.git"  # Ihre Git Repository URL
GIT_BRANCH="main"  # oder "master", je nach Repository
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
    print_error "Bitte als root ausführen (sudo ./deploy-git.sh)"
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

# 2. Repository clonen oder aktualisieren
if [ -d "$APP_DIR/.git" ]; then
    print_info "Repository existiert bereits. Aktualisiere..."
    cd "$APP_DIR"
    
    # Lokale Änderungen sichern (falls vorhanden)
    if ! git diff-index --quiet HEAD --; then
        print_warning "Lokale Änderungen gefunden. Erstelle Backup..."
        git stash
    fi
    
    # Repository aktualisieren
    git fetch origin
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
    
    print_info "Repository aktualisiert"
else
    print_info "Clone Repository von $GIT_REPO..."
    
    # Verzeichnis erstellen falls nicht vorhanden
    mkdir -p "$(dirname "$APP_DIR")"
    
    # Repository clonen
    git clone -b "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
    
    cd "$APP_DIR"
    print_info "Repository geclont"
fi

# 3. .env.production erstellen (falls nicht vorhanden)
if [ ! -f "$APP_DIR/.env.production" ]; then
    print_warning ".env.production nicht gefunden. Erstelle Template..."
    cat > "$APP_DIR/.env.production" << EOF
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
EOF
    print_warning "WICHTIG: Bitte bearbeiten Sie $APP_DIR/.env.production und fügen Sie Ihren API-Key ein!"
    echo ""
    read -p "Möchten Sie jetzt den API-Key eingeben? (j/n): " ENTER_KEY
    if [ "$ENTER_KEY" = "j" ] || [ "$ENTER_KEY" = "J" ]; then
        read -p "Geben Sie Ihren Gemini API-Key ein: " API_KEY
        sed -i "s/your_api_key_here/$API_KEY/" "$APP_DIR/.env.production"
        print_info "API-Key gespeichert"
    fi
fi

# 4. npm Abhängigkeiten installieren
print_info "Installiere npm Abhängigkeiten..."
npm install --production=false

# 5. Build der Anwendung
print_info "Baue Produktionsversion..."
npm run build

# 6. Berechtigungen setzen
print_info "Setze Berechtigungen..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# 7. nginx konfigurieren
print_info "Konfiguriere nginx..."
if [ -f "$APP_DIR/nginx.conf" ]; then
    # Backup der alten Konfiguration (falls vorhanden)
    if [ -f "$NGINX_AVAILABLE" ]; then
        cp "$NGINX_AVAILABLE" "$NGINX_AVAILABLE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    cp "$APP_DIR/nginx.conf" "$NGINX_AVAILABLE"
    
    # Symlink erstellen falls nicht vorhanden
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    fi
    
    # Domain/IP anpassen (falls noch nicht geschehen)
    if grep -q "your-server-domain.com" "$NGINX_AVAILABLE"; then
        print_warning "Bitte passen Sie die Domain in $NGINX_AVAILABLE an!"
        echo ""
        read -p "Möchten Sie jetzt die Domain/IP eingeben? (j/n): " ENTER_DOMAIN
        if [ "$ENTER_DOMAIN" = "j" ] || [ "$ENTER_DOMAIN" = "J" ]; then
            read -p "Geben Sie Ihre Domain oder Server-IP ein: " DOMAIN
            sed -i "s/your-server-domain.com/$DOMAIN/" "$NGINX_AVAILABLE"
            print_info "Domain aktualisiert: $DOMAIN"
        fi
    fi
    
    # nginx Konfiguration testen
    if nginx -t; then
        # nginx neu laden
        systemctl reload nginx
        print_info "nginx konfiguriert und neu geladen"
    else
        print_error "nginx Konfiguration fehlerhaft! Bitte überprüfen Sie $NGINX_AVAILABLE"
        exit 1
    fi
else
    print_warning "nginx.conf nicht im Repository gefunden. Bitte manuell konfigurieren."
fi

# 8. Systemd Service einrichten (optional)
if [ -f "$APP_DIR/admin-page.service" ]; then
    if [ ! -f "$SERVICE_FILE" ]; then
        print_info "Richte systemd Service ein..."
        cp "$APP_DIR/admin-page.service" "$SERVICE_FILE"
        systemctl daemon-reload
        systemctl enable admin-page.service
        systemctl start admin-page.service
        print_info "Systemd Service eingerichtet und gestartet"
    else
        print_info "Aktualisiere systemd Service..."
        systemctl stop admin-page.service || true
        cp "$APP_DIR/admin-page.service" "$SERVICE_FILE"
        systemctl daemon-reload
        systemctl start admin-page.service
        print_info "Systemd Service aktualisiert"
    fi
fi

# 9. Firewall konfigurieren (falls ufw aktiv)
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        print_info "Konfiguriere Firewall (ufw)..."
        ufw allow 'Nginx Full' > /dev/null 2>&1 || true
        print_info "Firewall konfiguriert"
    fi
fi

# 10. Git Informationen anzeigen
echo ""
print_info "Aktuelle Version:"
git log -1 --pretty=format:"  Commit: %h%n  Author: %an%n  Date: %ad%n  Message: %s" --date=short
echo ""

# 11. Status anzeigen
echo ""
echo "=================================="
print_info "Deployment abgeschlossen!"
echo "=================================="
echo ""
print_info "Deployment-Informationen:"
echo "  Repository: $GIT_REPO"
echo "  Branch: $GIT_BRANCH"
echo "  Installationsverzeichnis: $APP_DIR"
echo ""
print_info "Die Anwendung sollte nun unter http://$(hostname -I | awk '{print $1}') erreichbar sein"
echo ""
print_info "Nützliche Befehle:"
echo "  Updates abrufen: cd $APP_DIR && sudo ./deploy-git.sh"
echo "  Logs anzeigen: sudo tail -f /var/log/nginx/access.log"
echo "  nginx neu laden: sudo systemctl reload nginx"
if systemctl is-active --quiet admin-page.service; then
    echo "  Service-Logs: sudo journalctl -u admin-page.service -f"
fi
echo ""

# Status-Übersicht
print_info "Service-Status:"
systemctl status nginx --no-pager --lines=3 | grep -E "Active:|Loaded:"

if systemctl is-active --quiet admin-page.service; then
    systemctl status admin-page.service --no-pager --lines=3 | grep -E "Active:|Loaded:"
fi
