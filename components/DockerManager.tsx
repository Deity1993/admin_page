
import React, { useState } from 'react';
import { Play, Square, RotateCw, ExternalLink, MoreVertical, Search, Plus, Box } from 'lucide-react';
import { ServiceStatus, ContainerInfo } from '../types';

const INITIAL_CONTAINERS: ContainerInfo[] = [
  { id: 'c1', name: 'n8n_automation', image: 'n8nio/n8n:latest', status: ServiceStatus.RUNNING, uptime: '12 days', port: 5678 },
  { id: 'c2', name: 'my_custom_app', image: 'local/custom-node-app:v1.2', status: ServiceStatus.RUNNING, uptime: '4 days', port: 3000 },
  { id: 'c3', name: 'redis_cache', image: 'redis:alpine', status: ServiceStatus.STOPPED, uptime: '0s', port: 6379 },
  { id: 'c4', name: 'postgres_db', image: 'postgres:15-alpine', status: ServiceStatus.RUNNING, uptime: '12 days', port: 5432 },
];

const DockerManager: React.FC = () => {
  const [containers, setContainers] = useState(INITIAL_CONTAINERS);
  const [search, setSearch] = useState('');

  const toggleStatus = (id: string) => {
    setContainers(prev => prev.map(c => 
      c.id === id 
      ? { ...c, status: c.status === ServiceStatus.RUNNING ? ServiceStatus.STOPPED : ServiceStatus.RUNNING, uptime: c.status === ServiceStatus.RUNNING ? '0s' : 'Just now' } 
      : c
    ));
  };

  const filtered = containers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

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
          <button className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-xl transition shadow-lg shadow-orange-900/20 text-sm font-bold">
            <Plus className="w-4 h-4" />
            <span>Deploy New</span>
          </button>
        </div>
      </div>

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
                  <span className="text-xs font-semibold text-blue-400 flex items-center">
                    {container.port} <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
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
