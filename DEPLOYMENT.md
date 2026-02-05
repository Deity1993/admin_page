# Admin Page - Deployment auf Ubuntu Server

Diese Anleitung beschreibt, wie Sie das Admin-Panel auf einem Ubuntu Server deployen und per Web zugänglich machen.

## 📋 Voraussetzungen

- Ubuntu Server 20.04 oder höher
- Root- oder sudo-Zugriff
- Internetverbindung
- (Optional) Domain-Name für HTTPS

## 🚀 Schnell-Installation

### Automatisches Deployment

1. **Dateien auf den Server übertragen:**
   ```bash
   # Von Ihrem lokalen Rechner (im Projektverzeichnis)
   scp -r * username@server-ip:/tmp/admin_page/
   ```

2. **Auf dem Server:**
   ```bash
   cd /tmp/admin_page
   sudo chmod +x deploy.sh
   sudo ./deploy.sh
   ```

3. **API-Key konfigurieren:**
   ```bash
   sudo nano /var/www/admin_page/.env.production
   # Fügen Sie Ihren Gemini API-Key ein
   ```

4. **Domain-Name anpassen:**
   ```bash
   sudo nano /etc/nginx/sites-available/admin_page
   # Ändern Sie "your-server-domain.com" zu Ihrer Domain oder IP
   ```

5. **nginx neu laden:**
   ```bash
   sudo systemctl reload nginx
   ```

Das war's! Die Anwendung sollte nun unter `http://ihre-server-ip` erreichbar sein.

---

## 📖 Manuelle Installation

Falls Sie die Installation lieber Schritt für Schritt durchführen möchten:

### 1. System vorbereiten

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Benötigte Pakete installieren
sudo apt install -y nginx nodejs npm git curl
```

### 2. Node.js aktualisieren (falls nötig)

```bash
# Node.js 20.x installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Version prüfen
node -v  # sollte v20.x oder höher sein
npm -v
```

### 3. Anwendung vorbereiten

```bash
# Verzeichnis erstellen
sudo mkdir -p /var/www/admin_page

# Dateien kopieren (von Ihrem Upload-Verzeichnis)
sudo cp -r /tmp/admin_page/* /var/www/admin_page/

# Ins Verzeichnis wechseln
cd /var/www/admin_page
```

### 4. Umgebungsvariablen konfigurieren

```bash
# .env.production erstellen
sudo nano /var/www/admin_page/.env.production
```

Inhalt:
```env
GEMINI_API_KEY=IhrGeminiAPIKey
NODE_ENV=production
```

### 5. Abhängigkeiten installieren und Build erstellen

```bash
cd /var/www/admin_page

# Abhängigkeiten installieren
sudo npm install

# Produktions-Build erstellen
sudo npm run build

# Berechtigungen setzen
sudo chown -R www-data:www-data /var/www/admin_page
sudo chmod -R 755 /var/www/admin_page
```

### 6. nginx konfigurieren

```bash
# nginx Konfiguration kopieren
sudo cp /var/www/admin_page/nginx.conf /etc/nginx/sites-available/admin_page

# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/admin_page /etc/nginx/sites-enabled/

# Domain anpassen
sudo nano /etc/nginx/sites-available/admin_page
# Ändern Sie "your-server-domain.com" zu Ihrer Domain oder Server-IP

# Konfiguration testen
sudo nginx -t

# nginx neu starten
sudo systemctl restart nginx
```

### 7. Firewall konfigurieren

```bash
# nginx in Firewall erlauben
sudo ufw allow 'Nginx Full'

# Status prüfen
sudo ufw status
```

### 8. (Optional) Systemd Service einrichten

Falls Sie die Anwendung auch als Service laufen lassen möchten:

```bash
# Service-Datei kopieren
sudo cp /var/www/admin_page/admin-page.service /etc/systemd/system/

# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable admin-page.service
sudo systemctl start admin-page.service

# Status prüfen
sudo systemctl status admin-page.service
```

---

## 🔒 HTTPS mit Let's Encrypt (empfohlen)

### SSL-Zertifikat installieren

```bash
# Certbot installieren
sudo apt install -y certbot python3-certbot-nginx

# Zertifikat erstellen (ersetzen Sie ihre-domain.com)
sudo certbot --nginx -d ihre-domain.com

# Automatische Erneuerung testen
sudo certbot renew --dry-run
```

### nginx.conf für HTTPS anpassen

Die auskommentierte HTTPS-Konfiguration in [nginx.conf](nginx.conf) kann aktiviert werden, nachdem das SSL-Zertifikat erstellt wurde.

---

## 🔧 Wartung und Verwaltung

### Logs anzeigen

```bash
# nginx Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Service Logs (falls systemd Service läuft)
sudo journalctl -u admin-page.service -f
```

### Anwendung aktualisieren

```bash
cd /var/www/admin_page

# Neue Dateien kopieren
# ... Dateien aktualisieren ...

# Neu bauen
sudo npm install
sudo npm run build

# Berechtigungen setzen
sudo chown -R www-data:www-data /var/www/admin_page

# nginx neu laden (für statische Dateien)
sudo systemctl reload nginx

# Service neu starten (falls verwendet)
sudo systemctl restart admin-page.service
```

### nginx neu starten

```bash
# Konfiguration testen
sudo nginx -t

# Neu laden (ohne Downtime)
sudo systemctl reload nginx

# Neu starten
sudo systemctl restart nginx

# Status prüfen
sudo systemctl status nginx
```

---

## 🛡️ Sicherheitsempfehlungen

1. **Firewall konfigurieren:**
   ```bash
   sudo ufw enable
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   ```

2. **Regelmäßige Updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Starke Passwörter verwenden** für Server-Zugang

4. **SSH-Zugriff absichern:**
   - Verwenden Sie SSH-Keys statt Passwörter
   - Deaktivieren Sie Root-Login
   - Ändern Sie den SSH-Port (optional)

5. **Backup einrichten:**
   ```bash
   # Backup erstellen
   sudo tar -czf admin_page_backup_$(date +%Y%m%d).tar.gz /var/www/admin_page
   ```

6. **Authentifizierung hinzufügen:**
   - Fügen Sie nginx Basic Auth hinzu für zusätzlichen Schutz
   ```bash
   sudo apt install apache2-utils
   sudo htpasswd -c /etc/nginx/.htpasswd admin
   ```
   
   Dann in [nginx.conf](nginx.conf) ergänzen:
   ```nginx
   location / {
       auth_basic "Admin Area";
       auth_basic_user_file /etc/nginx/.htpasswd;
       try_files $uri $uri/ /index.html;
   }
   ```

---

## 🐛 Fehlerbehebung

### Anwendung nicht erreichbar

1. nginx Status prüfen:
   ```bash
   sudo systemctl status nginx
   ```

2. Port 80/443 prüfen:
   ```bash
   sudo netstat -tulpn | grep nginx
   ```

3. Firewall prüfen:
   ```bash
   sudo ufw status
   ```

### Build-Fehler

```bash
# node_modules löschen und neu installieren
cd /var/www/admin_page
sudo rm -rf node_modules package-lock.json
sudo npm install
sudo npm run build
```

### nginx Fehler

```bash
# Konfiguration testen
sudo nginx -t

# Error Log prüfen
sudo tail -50 /var/log/nginx/error.log
```

---

## 📁 Dateistruktur auf dem Server

```
/var/www/admin_page/
├── dist/                    # Gebaute Produktionsdateien (von npm run build)
├── components/              # React Komponenten
├── services/                # Services
├── .env.production          # Produktions-Umgebungsvariablen
├── package.json
└── ...

/etc/nginx/sites-available/admin_page    # nginx Konfiguration
/etc/systemd/system/admin-page.service   # systemd Service (optional)
```

---

## 📞 Support

Bei Problemen:
1. Prüfen Sie die Logs (siehe oben)
2. Stellen Sie sicher, dass alle Ports offen sind
3. Überprüfen Sie die .env.production Datei
4. Testen Sie die nginx Konfiguration

---

## 📝 Changelog

- **Version 1.0** - Initiales Deployment-Setup mit nginx und optionalem systemd Service
