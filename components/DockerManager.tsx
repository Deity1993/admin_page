
import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCw, ExternalLink, MoreVertical, Search, Plus, Box, Download, Archive, Trash2 } from 'lucide-react';
import { ServiceStatus, ContainerInfo } from '../types';

const API_BASE = window.location.origin;

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  uptime: string;
  port: number | null;
}

interface BackupFile {
  filename: string;
  size: number;
  created: string;
  containerName: string;
}

const DockerManager: React.FC = () => {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creatingBackup, setCreatingBackup] = useState<string | null>(null);
  const [showBackups, setShowBackups] = useState(false);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/docker/containers`);
        const data: DockerContainer[] = await response.json();
        
        const mapped: ContainerInfo[] = data.map(c => ({
          id: c.id,
          name: c.name,
          image: c.image,
          status: c.status === 'running' ? ServiceStatus.RUNNING : ServiceStatus.STOPPED,
          uptime: c.uptime,
          port: c.port || 0
        }));
        
        setContainers(mapped);
      } catch (error) {
        console.error('Failed to fetch containers:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchBackups = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/docker/backups`);
        const data = await response.json();
        setBackups(data);
      } catch (error) {
        console.error('Failed to fetch backups:', error);
      }
    };

    fetchContainers();
    fetchBackups();
    const interval = setInterval(() => {
      fetchContainers();
      fetchBackups();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const toggleStatus = (id: string) => {
    setContainers(prev => prev.map(c => 
      c.id === id 
      ? { ...c, status: c.status === ServiceStatus.RUNNING ? ServiceStatus.STOPPED : ServiceStatus.RUNNING, uptime: c.status === ServiceStatus.RUNNING ? '0s' : 'Just now' } 
      : c
    ));
  };

  const createBackup = async (containerName: string) => {
    setCreatingBackup(containerName);
    try {
      const response = await fetch(`${API_BASE}/api/docker/backup/${containerName}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh backups list
        const backupsResponse = await fetch(`${API_BASE}/api/docker/backups`);
        const backupsData = await backupsResponse.json();
        setBackups(backupsData);
        alert(`Backup erstellt: ${data.filename}`);
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      alert('Backup Erstellung fehlgeschlagen');
    } finally {
      setCreatingBackup(null);
    }
  };

  const downloadBackup = (filename: string) => {
    window.open(`${API_BASE}/api/docker/backup/download/${filename}`, '_blank');
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Backup "${filename}" wirklich löschen?`)) return;
    
    try {
      await fetch(`${API_BASE}/api/docker/backup/${filename}`, {
        method: 'DELETE'
      });
      
      // Refresh backups list
      const response = await fetch(`${API_BASE}/api/docker/backups`);
      const data = await response.json();
      setBackups(data);
    } catch (error) {
      console.error('Backup deletion failed:', error);
      alert('Backup Löschen fehlgeschlagen');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filtered = containers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="text-center text-slate-400">Loading Docker containers...</div>;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Docker Containers</h2>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Filter containers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
          <button 
            onClick={() => setShowBackups(!showBackups)}
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl transition text-sm font-bold"
          >
            <Archive className="w-4 h-4" />
            <span>Backups ({backups.length})</span>
          </button>
          <button className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-xl transition shadow-lg shadow-orange-900/20 text-sm font-bold">
            <Plus className="w-4 h-4" />
            <span>Deploy New</span>
          </button>
        </div>
      </div>

      {showBackups && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Archive className="w-5 h-5 mr-2 text-orange-400" />
            Verfügbare Backups
          </h3>
          {backups.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Keine Backups vorhanden</p>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div key={backup.filename} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700 hover:border-slate-600 transition">
                  <div>
                    <p className="font-semibold text-white">{backup.containerName}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(backup.created).toLocaleString('de-DE')} • {formatBytes(backup.size)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => downloadBackup(backup.filename)}
                      className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBackup(backup.filename)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
              <th className="px-6 py-4">Container Name</th>
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Uptime</th>
              <th className="px-6 py-4">Port Mapping</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filtered.map((container) => (
              <tr key={container.id} className="hover:bg-slate-700/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
                      {/* Fixed: Added 'Box' to lucide-react imports */}
                      <Box className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="font-bold text-white">{container.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="code-font text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-700">
                    {container.image}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    container.status === ServiceStatus.RUNNING 
                    ? 'bg-green-400/10 text-green-400 border-green-400/20' 
                    : 'bg-red-400/10 text-red-400 border-red-400/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${container.status === ServiceStatus.RUNNING ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    {container.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">
                  {container.uptime}
                </td>
                <td className="px-6 py-4">
                  {container.port ? (
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-blue-400">
                        Port: {container.port}
                      </span>
                      <a 
                        href={`http://zubenko.de:${container.port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-400 hover:text-orange-300 flex items-center space-x-1 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>zubenko.de:{container.port}</span>
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => createBackup(container.name)}
                      disabled={creatingBackup === container.name}
                      className={`p-2 rounded-lg transition-colors ${
                        creatingBackup === container.name
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-blue-400 hover:bg-blue-400/10'
                      }`}
                      title="Backup erstellen"
                    >
                      <Archive className={`w-4 h-4 ${creatingBackup === container.name ? 'animate-pulse' : ''}`} />
                    </button>
                    <button 
                      onClick={() => toggleStatus(container.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        container.status === ServiceStatus.RUNNING 
                        ? 'text-red-400 hover:bg-red-400/10' 
                        : 'text-green-400 hover:bg-green-400/10'
                      }`}
                      title={container.status === ServiceStatus.RUNNING ? 'Stop' : 'Start'}
                    >
                      {container.status === ServiceStatus.RUNNING ? <Square className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DockerManager;
