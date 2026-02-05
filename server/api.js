import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';

const execAsync = promisify(exec);
const app = express();
const PORT = 3002;

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

    // Parse endpoints
    const peerLines = peers.stdout.split('\n').filter(line => line.trim() && !line.includes('Endpoint:') && !line.includes('==='));
    const totalPeers = peerLines.length;
    const onlinePeers = peerLines.filter(line => line.includes('Avail')).length;

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
    
    const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Endpoint:') && !line.includes('==='));
    
    const extensions = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      const username = parts[0];
      const status = line.includes('Unavail') || line.includes('Offline') ? 'Offline' : 'Online';
      
      return {
        username,
        status,
        ip: status === 'Online' ? '192.168.1.x' : '-',
        lastUsed: 'N/A'
      };
    });

    res.json(extensions.length > 0 ? extensions : [
      { username: 'No extensions', status: 'Offline', ip: '-', lastUsed: 'N/A' }
    ]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Admin API Server running on port ${PORT}`);
});
