import React, { useState, useEffect } from 'react';
import { Download, Package, FileArchive, AlertCircle, CheckCircle, Search, Filter, Calendar } from 'lucide-react';

interface AvayaFile {
  id: string;
  name: string;
  version: string;
  type: 'patch' | 'ova' | 'firmware' | 'upgrade';
  size: string;
  releaseDate: string;
  description: string;
  downloadUrl: string;
  category: string;
}

const AvayaManager: React.FC = () => {
  const [files, setFiles] = useState<AvayaFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<AvayaFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchAvayaFiles();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [files, searchTerm, filterType]);

  const fetchAvayaFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/avaya/files');
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching Avaya files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = () => {
    let filtered = files;
    
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(file => file.type === filterType);
    }
    
    setFilteredFiles(filtered);
  };

  const handleDownload = async (file: AvayaFile) => {
    try {
      setDownloadProgress(prev => ({ ...prev, [file.id]: 0 }));
      
      // Simulate download progress
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          const current = prev[file.id] || 0;
          if (current >= 100) {
            clearInterval(interval);
            return prev;
          }
          return { ...prev, [file.id]: current + 10 };
        });
      }, 300);

      const response = await fetch(`/api/avaya/download/${file.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.id];
          return newProgress;
        });
      }, 2000);
    } catch (error) {
      console.error('Download error:', error);
      alert('Fehler beim Herunterladen der Datei');
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.id];
        return newProgress;
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'patch': return <Package className="w-5 h-5" />;
      case 'ova': return <FileArchive className="w-5 h-5" />;
      case 'firmware': return <AlertCircle className="w-5 h-5" />;
      case 'upgrade': return <CheckCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'patch': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ova': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'firmware': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'upgrade': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="flex-1 p-8 ml-64">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Avaya Software</h1>
          <p className="text-slate-400">Download patches, OVA files, firmware, and upgrades</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Total Files</p>
                <h3 className="text-2xl font-bold text-white">{files.length}</h3>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">OVA Files</p>
                <h3 className="text-2xl font-bold text-white">{files.filter(f => f.type === 'ova').length}</h3>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
                <FileArchive className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Patches</p>
                <h3 className="text-2xl font-bold text-white">{files.filter(f => f.type === 'patch').length}</h3>
              </div>
              <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Firmware</p>
                <h3 className="text-2xl font-bold text-white">{files.filter(f => f.type === 'firmware').length}</h3>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search files, versions, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="patch">Patches</option>
                <option value="ova">OVA Files</option>
                <option value="firmware">Firmware</option>
                <option value="upgrade">Upgrades</option>
              </select>
            </div>
          </div>
        </div>

        {/* Files List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-12 rounded-2xl text-center">
              <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No files found</p>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div 
                key={file.id}
                className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl hover:border-orange-500/50 transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-3">
                      <div className={`p-3 rounded-xl border ${getTypeColor(file.type)}`}>
                        {getTypeIcon(file.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-1">{file.name}</h3>
                        <p className="text-slate-400 text-sm mb-2">{file.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center text-slate-500">
                            <Package className="w-3 h-3 mr-1" />
                            {file.category}
                          </span>
                          <span className="flex items-center text-slate-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(file.releaseDate).toLocaleDateString('de-DE')}
                          </span>
                          <span className={`px-2 py-1 rounded-lg font-semibold border ${getTypeColor(file.type)}`}>
                            {file.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-semibold">{file.version}</p>
                      <p className="text-slate-400 text-sm">{file.size}</p>
                    </div>
                    
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloadProgress[file.id] !== undefined}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-orange-900/40"
                    >
                      {downloadProgress[file.id] !== undefined ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          {downloadProgress[file.id]}%
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Download
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {downloadProgress[file.id] !== undefined && (
                  <div className="mt-4">
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                        style={{ width: `${downloadProgress[file.id]}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AvayaManager;
