import React, { useEffect, useMemo, useState } from 'react';
import { Upload, HardDrive, Folder, Download, Trash2, RefreshCw } from 'lucide-react';

type DiskSpace = {
  total: number;
  used: number;
  available: number;
};

type StoredFile = {
  name: string;
  size: number;
  created: string;
  modified: string;
};

const formatBytes = (bytes: number) => {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('de-DE');
};

const FileStorage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [diskSpace, setDiskSpace] = useState<DiskSpace>({ total: 0, used: 0, available: 0 });
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const usedPercent = useMemo(() => {
    if (!diskSpace.total) return 0;
    return Math.min(100, Math.round((diskSpace.used / diskSpace.total) * 100));
  }, [diskSpace]);

  const fetchDiskSpace = async () => {
    try {
      const res = await fetch('/api/hidrive/disk-space');
      if (!res.ok) return;
      const data = await res.json();
      setDiskSpace(data);
    } catch (error) {
      console.error('Error fetching disk space:', error);
    }
  };

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/hidrive/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      setMessage('Fehler beim Laden der Dateien');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiskSpace();
    fetchFiles();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
    setMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage('Bitte wähle mindestens eine Datei aus.');
      return;
    }

    setIsUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/hidrive/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      setMessage('Upload erfolgreich abgeschlossen.');
      setSelectedFiles(null);
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      await fetchFiles();
      await fetchDiskSpace();
    } catch (error) {
      console.error('Error uploading files:', error);
      setMessage('Upload fehlgeschlagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Datei ${name} wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/hidrive/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchFiles();
      await fetchDiskSpace();
    } catch (error) {
      console.error('Error deleting file:', error);
      setMessage('Löschen fehlgeschlagen.');
    }
  };

  const handleDownload = (name: string) => {
    window.location.href = `/api/hidrive/download/${encodeURIComponent(name)}`;
  };


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-slate-800">
                <HardDrive className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Verbleibender Speicher</p>
                <p className="text-xl font-semibold text-white">{formatBytes(diskSpace.available)}</p>
              </div>
            </div>
            <button
              onClick={fetchDiskSpace}
              className="p-2 text-slate-400 hover:text-white transition"
              title="Aktualisieren"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-orange-500"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-500">Belegt: {formatBytes(diskSpace.used)} von {formatBytes(diskSpace.total)}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <p className="text-sm text-slate-400">Dateien gespeichert</p>
          <p className="text-2xl font-semibold text-white mt-2">{files.length}</p>
          <p className="text-xs text-slate-500 mt-1">HiDrive</p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'upload'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="inline-flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'manage'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="inline-flex items-center space-x-2">
              <Folder className="w-4 h-4" />
              <span>Dateien</span>
            </span>
          </button>
          </div>
          <span className="text-xs text-slate-500">Uploads gehen direkt auf HiDrive.</span>
        </div>

        {message && (
          <div className="mb-4 text-sm text-orange-200 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
            {message}
          </div>
        )}

        {activeTab === 'upload' ? (
          <div className="space-y-4">
            <div className="border border-dashed border-slate-700 rounded-2xl p-8 text-center">
              <Upload className="w-8 h-8 text-orange-400 mx-auto mb-3" />
              <p className="text-slate-300">Dateien auswählen und auf HiDrive hochladen</p>
              <input
                id="file-upload-input"
                type="file"
                multiple
                onChange={handleFileChange}
                className="mt-4 w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
              />
            </div>

            {selectedFiles && selectedFiles.length > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-4 text-sm text-slate-300">
                <p className="font-semibold mb-2">Ausgewählte Dateien:</p>
                <ul className="space-y-1">
                  {Array.from(selectedFiles).map(file => (
                    <li key={file.name} className="flex justify-between">
                      <span>{file.name}</span>
                      <span className="text-slate-500">{formatBytes(file.size)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-6 py-3 rounded-xl bg-orange-600 text-white font-medium shadow-lg shadow-orange-900/30 hover:bg-orange-500 transition disabled:opacity-50"
            >
              {isUploading ? 'Upload läuft...' : 'Dateien hochladen'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Dateiverwaltung</p>
              <button
                onClick={fetchFiles}
                className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Aktualisieren</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2">Datei</th>
                    <th className="py-2">Größe</th>
                    <th className="py-2">Geändert</th>
                    <th className="py-2 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">Lade Dateien...</td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">Keine Dateien gefunden.</td>
                    </tr>
                  ) : (
                    files.map(file => (
                      <tr key={file.name} className="border-t border-slate-800">
                        <td className="py-3 font-medium text-white">{file.name}</td>
                        <td className="py-3 text-slate-400">{formatBytes(file.size)}</td>
                        <td className="py-3 text-slate-400">{formatDate(file.modified)}</td>
                        <td className="py-3">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => handleDownload(file.name)}
                              className="text-slate-400 hover:text-white"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(file.name)}
                              className="text-slate-400 hover:text-red-400"
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileStorage;
