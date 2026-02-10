import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Trash2, Clock, HardDrive, AlertCircle, Edit2, X, Check } from 'lucide-react';

interface Backup {
  id: string;
  filename: string;
  size: number;
  created: string;
  status: 'completed' | 'in_progress' | 'failed';
  notes?: string;
}

const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [diskSpace, setDiskSpace] = useState({ total: 0, used: 0, available: 0 });
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    fetchBackups();
    fetchDiskSpace();
    const interval = setInterval(fetchBackups, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backups');
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiskSpace = async () => {
    try {
      const response = await fetch('/api/system/disk-space');
      const data = await response.json();
      setDiskSpace(data);
    } catch (error) {
      console.error('Error fetching disk space:', error);
    }
  };

  const createBackup = async () => {
    if (creating) return;

    const confirmed = confirm(
      'Creating a full system backup may take 5-30 minutes depending on your system size. Continue?'
    );
    if (!confirmed) return;

    setCreating(true);
    setBackupProgress(0);

    try {
      const response = await fetch('/api/backups/create', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setEstimatedSize(data.estimatedSize || null);
        // Poll for completion
        let completed = false;
        let attempts = 0;
        while (!completed && attempts < 360) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const checkResponse = await fetch(`/api/backups/${data.backupId}/status`);
          const checkData = await checkResponse.json();

          setBackupProgress(checkData.progress || 0);

          if (checkData.status === 'completed') {
            completed = true;
            setEstimatedSize(null);
            fetchBackups();
            alert('✅ Backup completed successfully!');
          } else if (checkData.status === 'failed') {
            alert('❌ Backup failed. Check server logs for details.');
            completed = true;
            setEstimatedSize(null);
          }
          attempts++;
        }
      } else {
        alert('Failed to start backup: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating backup');
    } finally {
      setCreating(false);
      setBackupProgress(0);
    }
  };

  const downloadBackup = async (backup: Backup) => {
    try {
      const response = await fetch(`/api/backups/${backup.id}/download`);
      if (!response.ok) {
        alert('Failed to download backup');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading backup:', error);
      alert('Error downloading backup');
    }
  };

  const restoreBackup = async (backup: Backup) => {
    const confirmed = confirm(
      `⚠️ WARNING: Restoring a backup will replace your current system with the backup from ${new Date(backup.created).toLocaleString()}\n\nYour current data will be lost. This process takes 10-30 minutes.\n\nContinue?`
    );
    if (!confirmed) return;

    setRestoring(backup.id);

    try {
      const response = await fetch(`/api/backups/${backup.id}/restore`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert('✅ Restore process started. Server will restart in a few minutes.');
        // Redirect after 5 seconds
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        alert('Failed to restore backup: ' + (data.error || 'Unknown error'));
        setRestoring(null);
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Error restoring backup');
      setRestoring(null);
    }
  };

  const deleteBackup = async (backup: Backup) => {
    const confirmed = confirm(`Delete backup from ${new Date(backup.created).toLocaleString()}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/backups/${backup.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        fetchBackups();
        alert('Backup deleted successfully');
      } else {
        alert('Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Error deleting backup');
    }
  };

  const startEditingNotes = (backup: Backup) => {
    setEditingNotes(backup.id);
    setNotesText(backup.notes || '');
  };

  const saveNotes = async (backup: Backup) => {
    try {
      const response = await fetch(`/api/backups/${backup.id}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: notesText })
      });
      const data = await response.json();

      if (data.success) {
        fetchBackups();
        setEditingNotes(null);
      } else {
        alert('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Error saving notes');
    }
  };

  const cancelEditingNotes = () => {
    setEditingNotes(null);
    setNotesText('');
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const diskUsagePercent = diskSpace.total > 0
    ? Math.round((diskSpace.used / diskSpace.total) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white flex items-center">
            <HardDrive className="w-5 h-5 mr-2 text-blue-400" />
            Disk Space
          </h3>
          <span className="text-sm text-blue-300">{diskUsagePercent}% used</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              diskUsagePercent > 85
                ? 'bg-red-500'
                : diskUsagePercent > 70
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${diskUsagePercent}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-sm font-semibold text-white">{formatBytes(diskSpace.total)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Used</p>
            <p className="text-sm font-semibold text-white">{formatBytes(diskSpace.used)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Available</p>
            <p className="text-sm font-semibold text-white">{formatBytes(diskSpace.available)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white flex items-center mb-2">
              <Database className="w-5 h-5 mr-2 text-purple-400" />
              Create New Backup
            </h3>
            <p className="text-sm text-slate-400">
              Create a full system backup for recovery purposes
            </p>
          </div>
          <button
            onClick={createBackup}
            disabled={creating || diskSpace.available < 10737418240}
            className={`px-6 py-3 rounded-xl font-semibold transition flex items-center space-x-2 ${
              creating || diskSpace.available < 10737418240
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
            }`}
          >
            {creating ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Creating... {backupProgress}%</span>
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                <span>Create Backup</span>
              </>
            )}
          </button>
        </div>

        {diskSpace.available < 10737418240 && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-300">
              Not enough disk space. At least 10GB required (available: {formatBytes(diskSpace.available)})
            </p>
          </div>
        )}

        {creating && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400 animate-spin" />
            <div className="flex-1">
              <p className="text-sm text-blue-300">
                Backup in progress... {backupProgress}% complete
                {estimatedSize ? ` (Est. ${formatBytes(estimatedSize)})` : ''}
              </p>
              <p className="text-xs text-blue-400 mt-1">This may take 5-30 minutes. Do not close this window.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700/50">
          <h3 className="font-bold text-white">
            Backup Points ({backups.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-700/50">
          {loading ? (
            <div className="p-6 text-center">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Loading backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-6 text-center">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No backups yet. Create your first backup above.</p>
            </div>
          ) : (
            backups.map((backup) => (
              <div key={backup.id} className="p-6 hover:bg-slate-800/20 transition border-b border-slate-700/30 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-white">{backup.filename}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          backup.status === 'completed'
                            ? 'bg-green-500/20 text-green-300'
                            : backup.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {backup.status === 'completed' ? '✓ Completed' : backup.status === 'in_progress' ? '⏳ In Progress' : '✗ Failed'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <span>📦 {formatBytes(backup.size)}</span>
                      <span>📅 {new Date(backup.created).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => downloadBackup(backup)}
                      disabled={backup.status !== 'completed'}
                      className="p-2 hover:bg-slate-700 rounded-lg transition disabled:text-slate-600 disabled:cursor-not-allowed text-blue-400"
                      title="Download backup"
                    >
                      <Download className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => restoreBackup(backup)}
                      disabled={backup.status !== 'completed' || restoring !== null}
                      className="p-2 hover:bg-slate-700 rounded-lg transition disabled:text-slate-600 disabled:cursor-not-allowed text-orange-400"
                      title="Restore from this backup"
                    >
                      {restoring === backup.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </button>

                    <button
                      onClick={() => deleteBackup(backup)}
                      disabled={backup.status === 'in_progress'}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition disabled:text-slate-600 disabled:cursor-not-allowed text-red-400"
                      title="Delete backup"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    {editingNotes !== backup.id && (
                      <button
                        onClick={() => startEditingNotes(backup)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-slate-300"
                        title="Add/edit notes"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {editingNotes === backup.id ? (
                  <div className="mt-4 bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Add notes for this backup..."
                      className="w-full bg-slate-800 text-white placeholder-slate-500 rounded px-3 py-2 text-sm outline-none border border-slate-600 focus:border-blue-500 resize-none"
                      rows={3}
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => saveNotes(backup)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center space-x-1 transition"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={cancelEditingNotes}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm flex items-center space-x-1 transition"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : backup.notes ? (
                  <div className="mt-3 bg-slate-900/30 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-sm text-slate-300">{backup.notes}</p>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
        <h4 className="font-semibold text-white mb-3 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-yellow-400" />
          Important Information
        </h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Backups include full system filesystem, databases, and configurations</li>
          <li>• Backup creation time depends on system size (typically 5-30 minutes)</li>
          <li>• Restoring a backup will replace your entire system - current data will be lost</li>
          <li>• Keep at least 10GB free disk space for creating backups</li>
          <li>• Download backups to external storage for additional safety</li>
          <li>• Regular backups are recommended (weekly or monthly)</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupManager;
