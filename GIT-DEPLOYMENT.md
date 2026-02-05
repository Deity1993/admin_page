# 🚀 Git-basiertes Deployment auf Ubuntu Server

Diese Anleitung beschreibt, wie Sie das Admin-Panel über Git auf einem Ubuntu Server deployen.

## 📋 Voraussetzungen

- Ubuntu Server 20.04 oder höher
- Root- oder sudo-Zugriff
- Git Repository (GitHub, GitLab, Bitbucket, etc.)

## 🔧 Vorbereitung

### 1. Repository erstellen

Erstellen Sie ein Git Repository für Ihr Projekt:

**Option A: GitHub (empfohlen)**
```bash
# Auf Ihrem lokalen Rechner
cd c:\Users\marku\OneDrive\Desktop\AI\admin_page

# Git initialisieren (falls noch nicht geschehen)
git init

# Dateien hinzufügen
git add .
git commit -m "Initial commit: Admin Page"

# GitHub Repository erstellen (über GitHub Website)
# Dann:
git remote add origin https://github.com/IhrUsername/admin_page.git
git branch -M main
git push -u origin main
```

**Option B: GitLab/Bitbucket**
Analog zu GitHub, nutzen Sie die entsprechenden URLs.

### 2. .env.production Template

Die `.env.production` Datei ist in [.gitignore](.gitignore) ausgeschlossen und wird NICHT ins Repository hochgeladen (aus Sicherheitsgründen). Sie wird beim Deployment automatisch erstellt.

## 🚀 Deployment

### Methode 1: Automatisches Git-Deployment (empfohlen)

1. **deploy-git.sh anpassen:**
   
   Bearbeiten Sie [deploy-git.sh](deploy-git.sh) und ändern Sie die Git-URL:
   ```bash
   GIT_REPO="https://github.com/IhrUsername/admin_page.git"
   GIT_BRANCH="main"  # oder "master"
   ```

2. **deploy-git.sh ins Repository committen:**
   ```bash
   git add deploy-git.sh
   git commit -m "Add git deployment script"
   git push
   ```

3. **Auf dem Ubuntu Server:**
   ```bash
   # Script herunterladen und ausführen
   wget https://raw.githubusercontent.com/IhrUsername/admin_page/main/deploy-git.sh
   chmod +x deploy-git.sh
   sudo ./deploy-git.sh
   ```

   Das Script führt automatisch aus:
   - Installiert Abhängigkeiten (nginx, Node.js, Git)
   - Clont das Repository nach `/var/www/admin_page`
   - Installiert npm-Pakete
   - Baut die Produktionsversion
   - Konfiguriert nginx
   - Richtet den systemd Service ein

4. **Bei Updates:**
   ```bash
   # Einfach das Script erneut ausführen
   cd /var/www/admin_page
   sudo ./deploy-git.sh
   ```

### Methode 2: Manuelles Git-Deployment

```bash
# 1. Repository clonen
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/IhrUsername/admin_page.git
cd admin_page

# 2. Abhängigkeiten installieren
sudo npm install

# 3. .env.production erstellen
sudo nano .env.production
# Fügen Sie Ihren API-Key ein:
# GEMINI_API_KEY=Ihr_API_Key
# NODE_ENV=production

# 4. Build erstellen
sudo npm run build

# 5. nginx konfigurieren
sudo cp nginx.conf /etc/nginx/sites-available/admin_page
sudo ln -s /etc/nginx/sites-available/admin_page /etc/nginx/sites-enabled/
sudo nano /etc/nginx/sites-available/admin_page  # Domain anpassen
sudo nginx -t
sudo systemctl reload nginx

# 6. Berechtigungen setzen
sudo chown -R www-data:www-data /var/www/admin_page
sudo chmod -R 755 /var/www/admin_page

# 7. Firewall
sudo ufw allow 'Nginx Full'
```

## 🔄 Updates deployen

### Automatisch mit Script

```bash
cd /var/www/admin_page
sudo ./deploy-git.sh
```

### Manuell

```bash
cd /var/www/admin_page

# 1. Änderungen abrufen
sudo git pull origin main

# 2. Abhängigkeiten aktualisieren
sudo npm install

# 3. Neu bauen
sudo npm run build

# 4. nginx neu laden
sudo systemctl reload nginx

# 5. Service neu starten (falls verwendet)
sudo systemctl restart admin-page.service
```

## 🔐 Private Repositories

Falls Ihr Repository privat ist:

### Option 1: SSH-Keys (empfohlen)

```bash
# 1. SSH-Key auf dem Server generieren
sudo ssh-keygen -t ed25519 -C "server@admin-page"

# 2. Öffentlichen Key anzeigen
sudo cat ~/.ssh/id_ed25519.pub

# 3. Key zu GitHub/GitLab hinzufügen
# GitHub: Settings → SSH and GPG keys → New SSH key

# 4. Repository URL in deploy-git.sh ändern
GIT_REPO="git@github.com:IhrUsername/admin_page.git"
```

### Option 2: Personal Access Token

```bash
# 1. Token auf GitHub erstellen
# GitHub: Settings → Developer settings → Personal access tokens

# 2. Repository URL mit Token
GIT_REPO="https://IhrUsername:ghp_IhrToken@github.com/IhrUsername/admin_page.git"
```

### Option 3: Git Credentials speichern

```bash
# Credentials für HTTPS speichern
cd /var/www/admin_page
sudo git config credential.helper store
sudo git pull  # Einmalig Username und Token eingeben
```

## 🤖 CI/CD mit GitHub Actions (optional)

Automatisches Deployment bei jedem Push:

```bash
# .github/workflows/deploy.yml erstellen
mkdir -p .github/workflows
```

Datei `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Ubuntu Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy via SSH
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/admin_page
          sudo ./deploy-git.sh
```

GitHub Secrets einrichten:
- `SERVER_HOST`: Ihre Server-IP
- `SERVER_USER`: SSH-Benutzername
- `SSH_PRIVATE_KEY`: Privater SSH-Key

## 📁 Repository-Struktur

```
admin_page/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD (optional)
├── components/                  # React Komponenten
├── services/                    # Services
├── .env.production             # NICHT im Repo! (in .gitignore)
├── .gitignore                  # Git Ignore-Datei
├── deploy-git.sh               # Git Deployment Script
├── deploy.sh                   # Manuelles Deployment Script
├── nginx.conf                  # nginx Konfiguration
├── admin-page.service          # systemd Service
├── DEPLOYMENT.md               # Deployment-Anleitung
├── GIT-DEPLOYMENT.md           # Diese Datei
└── package.json
```

## 🛡️ Sicherheit

1. **Niemals committen:**
   - API-Keys (`.env.production`, `.env.local`)
   - `node_modules/`
   - Build-Artefakte (`dist/`)
   - Sensitive Daten

2. **Branch-Protection:**
   - Richten Sie Protected Branches auf GitHub ein
   - Aktivieren Sie Review-Requirements

3. **Secrets Management:**
   - Verwenden Sie GitHub Secrets für CI/CD
   - Niemals Credentials im Code

## 🐛 Fehlerbehebung

### Git Clone schlägt fehl

```bash
# SSH-Verbindung testen
ssh -T git@github.com

# HTTPS-Verbindung testen
git ls-remote https://github.com/IhrUsername/admin_page.git
```

### Permission denied

```bash
# Berechtigungen für Git-Verzeichnis setzen
sudo chown -R www-data:www-data /var/www/admin_page
sudo chmod -R 755 /var/www/admin_page
```

### Build-Fehler nach git pull

```bash
# node_modules neu installieren
cd /var/www/admin_page
sudo rm -rf node_modules package-lock.json
sudo npm install
sudo npm run build
```

## 📊 Workflow-Übersicht

```
Lokale Entwicklung
       ↓
   git commit
       ↓
    git push
       ↓
GitHub/GitLab Repository
       ↓
Ubuntu Server (git pull)
       ↓
npm install & build
       ↓
   nginx reload
       ↓
Live Application
```

## ✅ Checkliste

Vor dem ersten Deployment:
- [ ] Git Repository erstellt
- [ ] `.gitignore` konfiguriert (`.env` Dateien ausgeschlossen)
- [ ] `deploy-git.sh` mit korrekter Repository-URL
- [ ] Code committed und gepusht
- [ ] SSH-Keys oder Access Token konfiguriert (bei private repos)

Nach dem Deployment:
- [ ] `.env.production` auf dem Server mit API-Key erstellt
- [ ] nginx Domain/IP angepasst
- [ ] Firewall konfiguriert
- [ ] HTTPS mit Let's Encrypt (empfohlen)
- [ ] Backup-Strategie implementiert

## 🔗 Nützliche Links

- [GitHub SSH Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

Bei Fragen oder Problemen, prüfen Sie die Logs:
```bash
sudo journalctl -u admin-page.service -f
sudo tail -f /var/log/nginx/error.log
```
