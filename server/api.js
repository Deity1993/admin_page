import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const server = http.createServer(app);
const PORT = 3002;

const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

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
  } catch (error) {
    res.status(500).json({ error: error.message });
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Admin API Server running on port ${PORT}`);
  console.log(`✅ WebSocket Terminal Server ready at ws://localhost:${PORT}/ws/terminal`);
});
