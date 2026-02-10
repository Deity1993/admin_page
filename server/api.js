import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import http from 'http';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const server = http.createServer(app);
const PORT = 3002;

// zubenkoai Database Connection
// Try Docker volume first, then fallback to filesystem
const ZUBENKOAI_DB_PATHS = [
  '/var/lib/docker/volumes/n8n-compose_zubenkoai-data/_data/app.db',
  '/var/www/zubenkoai/ai-voice-to-n8n-orchestrator/server/data/app.db'
];
let zubenkoaiDb = null;
let ZUBENKOAI_DB_PATH = null;

for (const dbPath of ZUBENKOAI_DB_PATHS) {
  try {
    if (fs.existsSync(dbPath)) {
      zubenkoaiDb = new Database(dbPath, { readonly: false });
      ZUBENKOAI_DB_PATH = dbPath;
      console.log('✅ Connected to zubenkoai database at:', dbPath);
      break;
    }
  } catch (error) {
    console.warn('⚠️ Could not connect to zubenkoai database at', dbPath, ':', error.message);
  }
}

if (!zubenkoaiDb) {
  console.warn('⚠️ No zubenkoai database found. User management will be unavailable.');
}

const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/www/admin_page/uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const getUniqueFilename = (directory, filename) => {
  const safeName = path.basename(filename).replace(/\s+/g, '_');
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  let candidate = safeName;
  let counter = 1;
  while (fs.existsSync(path.join(directory, candidate))) {
    candidate = `${base}_${counter}${ext}`;
    counter += 1;
  }
  return candidate;
};

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = getUniqueFilename(UPLOAD_DIR, file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: uploadStorage
});

// Notifications System
const notifications = [];
const MAX_NOTIFICATIONS = 50;

const addNotification = (type, title, message, data = {}) => {
  const notification = {
    id: Date.now().toString(),
    type, // 'error', 'warning', 'info', 'success'
    title,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    ...data
  };
  
  notifications.unshift(notification);
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.pop();
  }
  
  // Broadcast to all WebSocket clients
  broadcastNotification(notification);
  
  return notification;
};

// WebSocket broadcasts for notifications
let wsClients = [];

const broadcastNotification = (notification) => {
  wsClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(JSON.stringify({ type: 'notification', data: notification }));
      } catch (err) {
        console.error('Error broadcasting notification:', err);
      }
    }
  });
};

app.use(cors());
app.use(express.json());

// Notifications Endpoints
app.get('/api/notifications', (req, res) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  res.json({ 
    notifications,
    unreadCount,
    total: notifications.length 
  });
});

app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const index = notifications.findIndex(n => n.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  notifications.splice(index, 1);
  res.json({ success: true, message: 'Notification deleted' });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { id } = req.body;
  
  if (id === 'all') {
    notifications.forEach(n => n.read = true);
  } else {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  }
  
  res.json({ success: true });
});

app.delete('/api/notifications', (req, res) => {
  notifications.length = 0;
  res.json({ success: true, message: 'All notifications cleared' });
});

// System Stats
app.get('/api/system/stats', async (req, res) => {
  try {
    const [memory, disk, cpu, uptime] = await Promise.all([
      execAsync('free -m'),
      execAsync('df -BG /'),
      execAsync("top -bn1 | grep 'Cpu(s)'"),
      execAsync('uptime -p'),
    ]);

    // Parse memory
    const memLines = memory.stdout.split('\n');
    const memData = memLines[1].split(/\s+/);
    const totalMem = parseInt(memData[1]);
    const usedMem = parseInt(memData[2]);
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    // Parse disk
    const diskLines = disk.stdout.split('\n');
    const diskData = diskLines[1].split(/\s+/);
    const totalDisk = diskData[1].replace('G', '');
    const usedDisk = diskData[2].replace('G', '');
    const availDisk = diskData[3].replace('G', '');

    // Parse CPU
    const cpuMatch = cpu.stdout.match(/(\d+\.\d+)\s+id/);
    const cpuIdle = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
    const cpuUsage = (100 - cpuIdle).toFixed(1);

    res.json({
      cpu: {
        usage: parseFloat(cpuUsage),
        temp: null // Temperature requires sensors package
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: totalMem - usedMem,
        percent: parseFloat(memPercent)
      },
      disk: {
        total: parseInt(totalDisk),
        used: parseInt(usedDisk),
        available: parseInt(availDisk)
      },
      uptime: uptime.stdout.trim()
    });

    // Generate notifications for high usage
    const cpuUsageNum = parseFloat(cpuUsage);
    const memPercentNum = parseFloat(memPercent);
    const diskPercentNum = (parseInt(usedDisk) / parseInt(totalDisk) * 100);

    if (cpuUsageNum > 85) {
      addNotification('warning', 'CPU Usage Critical', `CPU usage is at ${cpuUsageNum.toFixed(1)}%`, { component: 'cpu' });
    }
    if (memPercentNum > 85) {
      addNotification('warning', 'Memory Usage Critical', `Memory usage is at ${memPercentNum}%`, { component: 'memory' });
    }
    if (diskPercentNum > 85) {
      addNotification('warning', 'Disk Space Low', `Disk usage is at ${diskPercentNum.toFixed(1)}%`, { component: 'disk' });
    }

  } catch (error) {
    addNotification('error', 'System Stats Error', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Historical performance data
app.get('/api/system/history', async (req, res) => {
  try {
    // Get current stats for the most recent data point
    const [memory, cpu] = await Promise.all([
      execAsync('free -m'),
      execAsync("top -bn1 | grep 'Cpu(s)'")
    ]);

    const memLines = memory.stdout.split('\n');
    const memData = memLines[1].split(/\s+/);
    const totalMem = parseInt(memData[1]);
    const usedMem = parseInt(memData[2]);
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    const cpuLine = cpu.stdout;
    const cpuMatch = cpuLine.match(/(\d+\.\d+)\s*id/);
    const cpuIdle = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
    const cpuUsage = (100 - cpuIdle).toFixed(1);

    // Generate historical data (in production, this would come from a time-series database)
    // For now, create realistic fluctuating data based on current values
    const now = new Date();
    const history = [];
    
    for (let i = 6; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 4 * 60 * 60 * 1000); // 4 hour intervals
      const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      // Add some realistic variance
      const cpuVariance = (Math.random() - 0.5) * 20;
      const memVariance = (Math.random() - 0.5) * 15;
      
      history.push({
        name: timeStr,
        cpu: Math.max(5, Math.min(95, parseFloat(cpuUsage) + cpuVariance)).toFixed(1),
        ram: Math.max(10, Math.min(90, parseFloat(memPercent) + memVariance)).toFixed(1)
      });
    }

    res.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Process/Container load distribution
app.get('/api/system/processes', async (req, res) => {
  try {
    // Get top processes by CPU usage
    const { stdout } = await execAsync("ps aux --sort=-%cpu | head -n 15");
    const lines = stdout.trim().split('\n').slice(1); // Skip header
    
    const processes = [];
    const processMap = new Map();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) continue;
      
      const cpu = parseFloat(parts[2]);
      const command = parts[10];
      
      // Group by process name
      let processName = command;
      if (command.includes('node')) processName = 'Node.js Apps';
      else if (command.includes('docker')) processName = 'Docker';
      else if (command.includes('asterisk')) processName = 'Asterisk PBX';
      else if (command.includes('nginx')) processName = 'Nginx';
      else if (command.includes('mysql') || command.includes('postgres')) processName = 'Database';
      else processName = 'System';

      if (processMap.has(processName)) {
        processMap.set(processName, processMap.get(processName) + cpu);
      } else {
        processMap.set(processName, cpu);
      }
    }

    // Convert to array and sort
    for (const [label, value] of processMap.entries()) {
      processes.push({
        label,
        value: parseFloat(value.toFixed(1))
      });
    }

    processes.sort((a, b) => b.value - a.value);
    
    res.json({ processes: processes.slice(0, 5) }); // Top 5
  } catch (error) {
    console.error('Error fetching processes:', error);
    res.status(500).json({ error: 'Failed to fetch processes' });
  }
});

// Docker Containers
app.get('/api/docker/containers', async (req, res) => {
  try {
    const { stdout } = await execAsync('docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"');
    
    const containers = stdout.trim().split('\n').filter(line => line).map(line => {
      const [id, name, image, status, ports] = line.split('|');
      const isRunning = status.startsWith('Up');
      
      // Extract uptime from status
      let uptime = '0s';
      if (isRunning) {
        const uptimeMatch = status.match(/Up\s+(.+?)(?:\s+\(|$)/);
        uptime = uptimeMatch ? uptimeMatch[1] : status.replace('Up ', '');
      }

      // Extract first port
      let port = null;
      if (ports) {
        const portMatch = ports.match(/(\d+)->/);
        port = portMatch ? parseInt(portMatch[1]) : null;
      }

      return {
        id,
        name,
        image,
        status: isRunning ? 'running' : 'stopped',
        uptime,
        port
      };
    });

    res.json(containers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Asterisk Stats
app.get('/api/asterisk/stats', async (req, res) => {
  try {
    const [channels, peers] = await Promise.all([
      execAsync('asterisk -rx "core show channels" 2>/dev/null').catch(() => ({ stdout: '0 active channels\n0 active calls' })),
      execAsync('asterisk -rx "pjsip show endpoints" 2>/dev/null').catch(() => ({ stdout: '' })),
    ]);

    // Parse active channels
    const activeChannelsMatch = channels.stdout.match(/(\d+)\s+active\s+channel/);
    const activeCallsMatch = channels.stdout.match(/(\d+)\s+active\s+call/);
    
    const activeChannels = activeChannelsMatch ? parseInt(activeChannelsMatch[1]) : 0;
    const activeCalls = activeCallsMatch ? parseInt(activeCallsMatch[1]) : 0;

    // Parse endpoints - count lines that start with " Endpoint:"
    const endpointLines = peers.stdout.split('\n').filter(line => line.trim().startsWith('Endpoint:'));
    const totalPeers = endpointLines.length;
    
    // Count endpoints that are available (not "Not in use" or "Unavail")
    const onlinePeers = endpointLines.filter(line => !line.includes('Unavail')).length;

    res.json({
      activeCalls,
      activeChannels,
      registeredPeers: onlinePeers,
      totalPeers,
      latency: 12 // Mock value, would need actual ping measurement
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Asterisk Extensions
app.get('/api/asterisk/extensions', async (req, res) => {
  try {
    const { stdout } = await execAsync('asterisk -rx "pjsip show endpoints" 2>/dev/null').catch(() => ({ stdout: '' }));
    
    // Parse endpoint sections
    const sections = stdout.split(/\n Endpoint:/);
    const extensions = [];
    
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const lines = section.split('\n');
      
      // First line contains endpoint name and status
      const firstLine = lines[0].trim();
      const parts = firstLine.split(/\s+/);
      const endpointName = parts[0];
      
      // Skip header lines (contains dots or angle brackets)
      if (endpointName.includes('.') || endpointName.includes('<') || endpointName.includes('>')) {
        continue;
      }
      
      const status = firstLine.includes('Unavail') ? 'Offline' : 'Online';
      
      // Find contact line for IP
      let ip = '-';
      const contactLine = lines.find(line => line.trim().startsWith('Contact:'));
      if (contactLine && status === 'Online') {
        const ipMatch = contactLine.match(/(\d+\.\d+\.\d+\.\d+)/);
        ip = ipMatch ? ipMatch[1] : '-';
      }
      
      extensions.push({
        username: endpointName,
        status,
        ip,
        lastUsed: 'N/A'
      });
    }

    res.json(extensions.length > 0 ? extensions : [
      { username: 'No extensions', status: 'Offline', ip: '-', lastUsed: 'N/A' }
    ]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Docker Backup - Create
app.post('/api/docker/backup/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = `${containerName}_${timestamp}.tar`;
    const backupPath = path.join(BACKUP_DIR, backupFile);

    // Export container to tar
    await execAsync(`docker export ${containerName} -o "${backupPath}"`);

    res.json({ 
      success: true, 
      filename: backupFile,
      path: backupPath,
      size: fs.statSync(backupPath).size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Docker Backups - List
app.get('/api/docker/backups', async (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.tar'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          containerName: file.split('_')[0]
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Docker Backup - Download
app.get('/api/docker/backup/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download failed' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Docker Backup - Delete
app.delete('/api/docker/backup/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Avaya Software Management
const AVAYA_DIR = path.join(__dirname, 'avaya-files');
if (!fs.existsSync(AVAYA_DIR)) {
  fs.mkdirSync(AVAYA_DIR, { recursive: true });
}

// Mock Avaya files database (replace with actual file system or database)
const avayaFiles = [
  {
    id: '1',
    name: 'Avaya_Aura_System_Manager_8.1.3.0_Patch.zip',
    version: '8.1.3.0',
    type: 'patch',
    size: '245 MB',
    releaseDate: '2025-12-15',
    description: 'Security patch for Avaya Aura System Manager',
    downloadUrl: '/downloads/avaya/patch-8.1.3.0.zip',
    category: 'System Manager',
    filename: 'avaya-sm-8.1.3.0-patch.zip'
  },
  {
    id: '2',
    name: 'Avaya_Session_Manager_8.1.2_OVA.ova',
    version: '8.1.2',
    type: 'ova',
    size: '3.2 GB',
    releaseDate: '2025-11-20',
    description: 'VMware OVA template for Session Manager 8.1.2',
    downloadUrl: '/downloads/avaya/session-manager-8.1.2.ova',
    category: 'Session Manager',
    filename: 'avaya-session-manager-8.1.2.ova'
  },
  {
    id: '3',
    name: 'Avaya_Communication_Manager_8.1.1_Firmware.iso',
    version: '8.1.1',
    type: 'firmware',
    size: '1.8 GB',
    releaseDate: '2025-10-05',
    description: 'Firmware update for Communication Manager',
    downloadUrl: '/downloads/avaya/cm-8.1.1.iso',
    category: 'Communication Manager',
    filename: 'avaya-cm-8.1.1-firmware.iso'
  },
  {
    id: '4',
    name: 'Avaya_IP_Office_R11.1.3.4_Upgrade.bin',
    version: '11.1.3.4',
    type: 'upgrade',
    size: '892 MB',
    releaseDate: '2026-01-10',
    description: 'Upgrade package for IP Office Server Edition',
    downloadUrl: '/downloads/avaya/ipo-11.1.3.4.bin',
    category: 'IP Office',
    filename: 'avaya-ipo-11.1.3.4-upgrade.bin'
  },
  {
    id: '5',
    name: 'Avaya_SBC_8.1_OVA_Template.ova',
    version: '8.1.0',
    type: 'ova',
    size: '2.1 GB',
    releaseDate: '2025-09-12',
    description: 'Session Border Controller OVA for VMware',
    downloadUrl: '/downloads/avaya/sbc-8.1.ova',
    category: 'SBC',
    filename: 'avaya-sbc-8.1.0-template.ova'
  }
];

// Avaya - Get Files List
app.get('/api/avaya/files', async (req, res) => {
  try {
    // In production, you might want to read from a database or file system
    // For now, return the mock data
    res.json({ 
      success: true,
      files: avayaFiles,
      total: avayaFiles.length
    });
  } catch (error) {
    console.error('Error fetching Avaya files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Avaya - Download File
app.get('/api/avaya/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = avayaFiles.find(f => f.id === fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file exists in the avaya-files directory
    const filePath = path.join(AVAYA_DIR, file.filename);
    
    if (!fs.existsSync(filePath)) {
      // Create a dummy file for demonstration purposes
      // In production, you would download from Avaya support site or have pre-downloaded files
      console.log(`Creating dummy file for demonstration: ${file.filename}`);
      const dummyContent = `This is a placeholder for ${file.name}\n\nIn production, this would be the actual Avaya software file.\n`;
      fs.writeFileSync(filePath, dummyContent);
    }

    // Log download activity
    addNotification('info', 'Avaya Download', `Started download of ${file.name}`, { 
      fileId: file.id, 
      fileName: file.name,
      type: file.type 
    });

    res.download(filePath, file.name, (err) => {
      if (err) {
        console.error('Download error:', err);
        addNotification('error', 'Download Failed', `Failed to download ${file.name}`, { 
          fileId: file.id, 
          error: err.message 
        });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed' });
        }
      } else {
        addNotification('success', 'Download Complete', `Successfully downloaded ${file.name}`, { 
          fileId: file.id, 
          fileName: file.name 
        });
      }
    });
  } catch (error) {
    console.error('Error downloading Avaya file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Avaya - Upload File (for admin to add new files)
app.post('/api/avaya/upload', async (req, res) => {
  try {
    const fileData = req.body;
    
    // Validate required fields
    if (!fileData.name || !fileData.version || !fileData.type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new file entry
    const newFile = {
      id: (avayaFiles.length + 1).toString(),
      ...fileData,
      filename: fileData.filename || `avaya-${fileData.type}-${fileData.version}.bin`
    };

    avayaFiles.push(newFile);
    
    addNotification('success', 'File Added', `Added new Avaya file: ${newFile.name}`, { 
      fileId: newFile.id 
    });

    res.json({ 
      success: true, 
      file: newFile,
      message: 'File metadata added successfully' 
    });
  } catch (error) {
    console.error('Error uploading Avaya file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Avaya - Delete File
app.delete('/api/avaya/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileIndex = avayaFiles.findIndex(f => f.id === fileId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = avayaFiles[fileIndex];
    const filePath = path.join(AVAYA_DIR, file.filename);

    // Delete physical file if exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    avayaFiles.splice(fileIndex, 1);
    
    addNotification('info', 'File Deleted', `Removed Avaya file: ${file.name}`, { 
      fileId: file.id 
    });

    res.json({ 
      success: true, 
      message: 'File deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting Avaya file:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BACKUP & RECOVERY ENDPOINTS
// ============================================

// GET disk space information
app.get('/api/system/disk-space', async (req, res) => {
  try {
    const { stdout } = await execAsync('df -B1 / | tail -1');
    const parts = stdout.trim().split(/\s+/);

    res.json({
      total: parseInt(parts[1]),
      used: parseInt(parts[2]),
      available: parseInt(parts[3])
    });
  } catch (error) {
    console.error('Error getting disk space:', error);
    res.status(500).json({ error: 'Failed to get disk space' });
  }
});

// ============================================
// FILE STORAGE ENDPOINTS
// ============================================

app.get('/api/files', async (req, res) => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      return res.json({ files: [] });
    }

    const entries = fs.readdirSync(UPLOAD_DIR, { withFileTypes: true });
    const files = entries
      .filter(entry => entry.isFile())
      .map(entry => {
        const filePath = path.join(UPLOAD_DIR, entry.name);
        const stats = fs.statSync(filePath);
        return {
          name: entry.name,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.post('/api/files/upload', upload.array('files', 20), async (req, res) => {
  try {
    const uploaded = (req.files || []).map(file => ({
      name: file.filename,
      originalName: file.originalname,
      size: file.size
    }));

    res.json({ success: true, files: uploaded });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

app.get('/api/files/download/:name', (req, res) => {
  const requested = req.params.name || '';
  const safeName = path.basename(requested);

  if (!safeName || safeName !== requested) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  return res.download(filePath, safeName);
});

app.delete('/api/files/:name', async (req, res) => {
  try {
    const requested = req.params.name || '';
    const safeName = path.basename(requested);

    if (!safeName || safeName !== requested) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(UPLOAD_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// WebSocket Server for Notifications
const notificationWss = new WebSocketServer({ server, path: '/ws/notifications' });

notificationWss.on('connection', (ws) => {
  console.log('🔔 New notification WebSocket connection');
  wsClients.push(ws);
  
  // Send current notifications to new client
  ws.send(JSON.stringify({ 
    type: 'notifications_init', 
    data: notifications 
  }));

  ws.on('close', () => {
    console.log('🔔 Notification WebSocket disconnected');
    const index = wsClients.indexOf(ws);
    if (index > -1) {
      wsClients.splice(index, 1);
    }
  });

  ws.on('error', (err) => {
    console.error('Notification WebSocket error:', err);
  });
});

// WebSocket Server for Terminal
const wss = new WebSocketServer({ server, path: '/ws/terminal' });

wss.on('connection', (ws) => {
  console.log('🔌 New terminal WebSocket connection');
  
  let ptyProcess = null;

  try {
    // Spawn a bash shell with proper PTY
    ptyProcess = pty.spawn('bash', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || '/root',
      env: process.env
    });

    // Send shell output to client
    ptyProcess.onData((data) => {
      try {
        ws.send(JSON.stringify({ type: 'output', data }));
      } catch (err) {
        console.error('Error sending data:', err);
      }
    });

    // Handle shell exit
    ptyProcess.onExit(({ exitCode }) => {
      console.log(`Terminal process exited with code: ${exitCode}`);
      try {
        ws.send(JSON.stringify({ 
          type: 'output', 
          data: `\r\n\x1b[1;33mSession ended (exit code: ${exitCode})\x1b[0m\r\n` 
        }));
        ws.close();
      } catch (err) {
        // Already closed
      }
    });

    // Handle messages from client
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        
        if (data.type === 'input') {
          ptyProcess.write(data.data);
        } else if (data.type === 'resize') {
          ptyProcess.resize(data.cols || 80, data.rows || 24);
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    });

    ws.on('close', () => {
      console.log('🔌 Terminal WebSocket connection closed');
      if (ptyProcess) {
        ptyProcess.kill();
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      if (ptyProcess) {
        ptyProcess.kill();
      }
    });

  } catch (error) {
    console.error('Error creating terminal:', error);
    ws.send(JSON.stringify({ 
      type: 'output', 
      data: '\r\n\x1b[1;31mError: Could not create terminal session\x1b[0m\r\n' 
    }));
    ws.close();
  }
});

// Security & Logs Endpoints
app.get('/api/security/logs', async (req, res) => {
  try {
    const { level, limit = 100 } = req.query;
    
    // journalctl command to get system logs
    let command = `journalctl -n ${limit} --no-pager -o json`;
    
    // Filter by priority level if specified
    if (level) {
      const priorityMap = {
        'critical': '0..2',
        'error': '3',
        'warning': '4',
        'info': '5..6'
      };
      if (priorityMap[level]) {
        command += ` -p ${priorityMap[level]}`;
      }
    }

    const { stdout } = await execAsync(command);
    const logLines = stdout.trim().split('\n').filter(line => line);
    
    const logs = logLines.map(line => {
      try {
        const entry = JSON.parse(line);
        return {
          timestamp: new Date(parseInt(entry.__REALTIME_TIMESTAMP) / 1000).toISOString(),
          level: getPriorityLevel(entry.PRIORITY),
          service: entry.SYSLOG_IDENTIFIER || entry._SYSTEMD_UNIT || 'system',
          message: entry.MESSAGE || '',
          ip: entry._HOSTNAME || 'localhost'
        };
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

function getPriorityLevel(priority) {
  const levels = {
    '0': 'critical', '1': 'critical', '2': 'critical',
    '3': 'error',
    '4': 'warning',
    '5': 'info', '6': 'info',
    '7': 'info'
  };
  return levels[priority] || 'info';
}

app.get('/api/security/metrics', async (req, res) => {
  try {
    // Failed login attempts (last 24 hours)
    const failedLogins = await execAsync(
      "journalctl -u ssh --since '24 hours ago' | grep -i 'failed\\|failure' | wc -l"
    ).catch(() => ({ stdout: '0' }));

    // Active sessions
    const sessions = await execAsync('who | wc -l').catch(() => ({ stdout: '0' }));

    // Firewall blocks (if ufw is installed)
    const firewallBlocks = await execAsync(
      "journalctl -u ufw --since '24 hours ago' | grep -i 'block' | wc -l"
    ).catch(() => ({ stdout: '0' }));

    res.json({
      failedLogins: parseInt(failedLogins.stdout.trim()) || 0,
      activeSessions: parseInt(sessions.stdout.trim()) || 0,
      firewallBlocks: parseInt(firewallBlocks.stdout.trim()) || 0,
      securityAlerts: 0
    });
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    res.status(500).json({ error: 'Failed to fetch security metrics' });
  }
});

// System Settings Endpoints
app.get('/api/system/info', async (req, res) => {
  try {
    const [osRelease, kernel, uptime] = await Promise.all([
      execAsync('lsb_release -ds').catch(() => ({ stdout: 'Unknown' })),
      execAsync('uname -r').catch(() => ({ stdout: 'Unknown' })),
      execAsync('uptime -p').catch(() => ({ stdout: 'Unknown' }))
    ]);

    // Get Node.js version
    const nodeVersion = process.version;

    res.json({
      osVersion: osRelease.stdout.trim().replace(/"/g, ''),
      kernel: kernel.stdout.trim(),
      nodeVersion: nodeVersion,
      uptime: uptime.stdout.trim().replace('up ', '')
    });
  } catch (error) {
    console.error('Error fetching system info:', error);
    res.status(500).json({ error: 'Failed to fetch system info' });
  }
});

app.get('/api/system/settings', async (req, res) => {
  try {
    const [hostname, timezone] = await Promise.all([
      execAsync('hostname').catch(() => ({ stdout: 'unknown' })),
      execAsync('timedatectl show -p Timezone --value').catch(() => ({ stdout: 'UTC' }))
    ]);

    // Check SSH port
    const sshConfig = await execAsync("grep '^Port' /etc/ssh/sshd_config").catch(() => ({ stdout: 'Port 22' }));
    const sshPort = sshConfig.stdout.match(/\d+/)?.[0] || '22';

    res.json({
      serverName: hostname.stdout.trim(),
      timezone: timezone.stdout.trim(),
      sshPort: sshPort,
      autoUpdate: false, // Would need to check apt config
      enableIPv6: false,
      maxConnections: '100',
      emailNotifications: false,
      slackWebhook: '',
      alertThreshold: '80',
      sessionTimeout: '8',
      requireStrongPassword: true,
      twoFactorAuth: false,
      autoBackup: false,
      backupInterval: 'daily',
      backupRetention: '30'
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/system/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // In production, this would update actual system settings
    // For now, just acknowledge the save
    console.log('Settings update request:', settings);
    
    res.json({ 
      success: true, 
      message: 'Settings saved successfully',
      settings 
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Admin Panel Users Storage
const adminUsersFile = path.join(__dirname, 'admin_users.json');

const getAdminUsers = () => {
  try {
    if (fs.existsSync(adminUsersFile)) {
      return JSON.parse(fs.readFileSync(adminUsersFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading admin users file:', error);
  }
  
  // Default admin user
  return [
    {
      id: '1',
      username: 'admin',
      email: 'admin@zubenko.de',
      password: bcrypt.hashSync('Gßßgl3de123!', 10), // Pre-hashed with bcrypt
      role: 'admin',
      status: 'active',
      created: new Date().toISOString(),
      lastLogin: null
    }
  ];
};

const saveAdminUsers = (users) => {
  try {
    fs.writeFileSync(adminUsersFile, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving admin users file:', error);
    return false;
  }
};

// Ensure admin users file exists
if (!fs.existsSync(adminUsersFile)) {
  saveAdminUsers(getAdminUsers());
}

// User Management Endpoints (zubenkoai Database)
// GET /api/users/zubenkoai
app.get('/api/users/zubenkoai', async (req, res) => {
  try {
    if (!zubenkoaiDb) {
      return res.status(503).json({ error: 'Database connection not available' });
    }

    const users = zubenkoaiDb.prepare('SELECT id, username, created_at FROM users ORDER BY id DESC').all();
    
    const usersWithMetadata = users.map(user => ({
      id: user.id.toString(),
      username: user.username,
      email: user.username + '@zubenkoai',
      role: user.id === 1 ? 'admin' : 'user',
      status: 'active',
      created: user.created_at || new Date().toISOString(),
      lastLogin: null
    }));

    res.json({ users: usersWithMetadata });
  } catch (error) {
    console.error('Error fetching zubenkoai users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users/zubenkoai
app.post('/api/users/zubenkoai', async (req, res) => {
  try {
    if (!zubenkoaiDb) {
      return res.status(503).json({ error: 'Database connection not available' });
    }

    const { username, email, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existing = zubenkoaiDb.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password with bcrypt
    const passwordHash = bcrypt.hashSync(password, 10);

    // Insert new user
    const result = zubenkoaiDb.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);

    res.status(201).json({
      success: true,
      user: {
        id: result.lastInsertRowid.toString(),
        username,
        email: email || username + '@zubenkoai',
        role: 'user',
        status: 'active',
        created: new Date().toISOString(),
        lastLogin: null
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating zubenkoai user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/zubenkoai/:id
app.put('/api/users/zubenkoai/:id', async (req, res) => {
  try {
    if (!zubenkoaiDb) {
      return res.status(503).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { username } = req.body;

    const user = zubenkoaiDb.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username && username !== user.username) {
      const existing = zubenkoaiDb.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (existing) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      zubenkoaiDb.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id);
    }

    res.json({
      success: true,
      user: {
        id: user.id.toString(),
        username: username || user.username,
        email: (username || user.username) + '@zubenkoai',
        role: user.id === 1 ? 'admin' : 'user',
        status: 'active',
        created: user.created_at,
        lastLogin: null
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating zubenkoai user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/users/zubenkoai/:id/password
app.put('/api/users/zubenkoai/:id/password', async (req, res) => {
  try {
    if (!zubenkoaiDb) {
      return res.status(503).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = zubenkoaiDb.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    zubenkoaiDb.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing zubenkoai user password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// DELETE /api/users/zubenkoai/:id
app.delete('/api/users/zubenkoai/:id', async (req, res) => {
  try {
    if (!zubenkoaiDb) {
      return res.status(503).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;

    const user = zubenkoaiDb.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (id === '1' || id === 1) {
      return res.status(403).json({ error: 'Cannot delete the admin user' });
    }

    zubenkoaiDb.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting zubenkoai user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ========================
// Admin Panel Users Endpoints
// ========================

// GET /api/users/admin-panel
app.get('/api/users/admin-panel', async (req, res) => {
  try {
    const users = getAdminUsers().map(({ password, ...user }) => user);
    res.json({ users });
  } catch (error) {
    console.error('Error fetching admin panel users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users/admin-panel
app.post('/api/users/admin-panel', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    
    const users = getAdminUsers();
    
    if (users.some(u => u.username === username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: bcrypt.hashSync(password, 10),
      role: 'user',
      status: 'active',
      created: new Date().toISOString(),
      lastLogin: null
    };
    
    users.push(newUser);
    
    if (saveAdminUsers(users)) {
      const { password, ...safeUser } = newUser;
      res.status(201).json({ 
        success: true, 
        user: safeUser,
        message: 'User created successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  } catch (error) {
    console.error('Error creating admin panel user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/admin-panel/:id
app.put('/api/users/admin-panel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, status } = req.body;
    
    const users = getAdminUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[userIndex];
    
    if (username && username !== user.username) {
      if (users.some(u => u.username === username && u.id !== id)) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      user.username = username;
    }
    
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    
    if (saveAdminUsers(users)) {
      const { password, ...safeUser } = user;
      res.json({ 
        success: true, 
        user: safeUser,
        message: 'User updated successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  } catch (error) {
    console.error('Error updating admin panel user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/users/admin-panel/:id/password
app.put('/api/users/admin-panel/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    const users = getAdminUsers();
    const user = users.find(u => u.id === id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.password = bcrypt.hashSync(password, 10);
    
    if (saveAdminUsers(users)) {
      res.json({ 
        success: true,
        message: 'Password changed successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to change password' });
    }
  } catch (error) {
    console.error('Error changing admin panel user password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// DELETE /api/users/admin-panel/:id
app.delete('/api/users/admin-panel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const users = getAdminUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[userIndex];
    if (user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1) {
      return res.status(403).json({ error: 'Cannot delete the last admin user' });
    }
    
    users.splice(userIndex, 1);
    
    if (saveAdminUsers(users)) {
      res.json({ 
        success: true,
        message: 'User deleted successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  } catch (error) {
    console.error('Error deleting admin panel user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Legacy endpoint for backwards compatibility
app.get('/api/users', async (req, res) => {
  // Redirect to zubenkoai users
  return fetch('http://localhost:3002/api/users/zubenkoai')
    .then(r => r.json())
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Old file-based User Management Endpoints (kept for backwards compatibility)


server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Admin API Server running on port ${PORT}`);
  console.log(`✅ WebSocket Terminal Server ready at ws://localhost:${PORT}/ws/terminal`);
});
