
import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Cpu, HardDrive, Activity, Thermometer, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const API_BASE = window.location.origin;

interface SystemStats {
  cpu: { usage: number; temp: number | null };
  memory: { total: number; used: number; free: number; percent: number };
  disk: { total: number; used: number; available: number };
  uptime: string;
}

interface HistoryData {
  name: string;
  cpu: string;
  ram: string;
}

interface ProcessLoad {
  label: string;
  value: number;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; trend?: number }> = ({ title, value, icon, color, trend }) => (
  <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/70 p-6 shadow-[0_20px_55px_-35px_rgba(2,6,23,0.95)] backdrop-blur-xl">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-sm font-medium text-slate-400">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-slate-100">{value}</h3>
        {trend !== undefined && (
          <div className={`mt-2 flex items-center text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}% from last hour
          </div>
        )}
      </div>
      <div className={`rounded-2xl border border-slate-700 bg-slate-800 p-3 ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [processes, setProcesses] = useState<ProcessLoad[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/system/stats`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      }
    };

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/system/history`);
        const data = await response.json();
        setHistory(data.history || []);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };

    const fetchProcesses = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/system/processes`);
        const data = await response.json();
        setProcesses(data.processes || []);
      } catch (error) {
        console.error('Error fetching processes:', error);
      }
    };

    const loadData = async () => {
      await Promise.all([fetchStats(), fetchHistory(), fetchProcesses()]);
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="rounded-[1.75rem] border border-slate-700 bg-slate-900/70 p-10 text-center text-slate-400 shadow-sm">Loading system stats...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-700/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(30,41,59,0.82))] p-6 shadow-[0_20px_60px_-35px_rgba(2,6,23,0.95)] sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Overview</p>
              <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-100">Server health at a glance.</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Die wichtigsten Kennzahlen und Lastspitzen werden in einer ruhigeren Oberflaeche zusammengezogen, damit Probleme schneller erkennbar sind.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">
              Panel refreshes every 10 seconds
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/70 p-5 shadow-sm">
            <p className="text-sm text-slate-400">CPU Temperature</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-100">{stats?.cpu.temp ? `${stats.cpu.temp.toFixed(0)} deg C` : 'n/a'}</p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/70 p-5 shadow-sm">
            <p className="text-sm text-slate-400">Memory Free</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-100">{((stats?.memory.free || 0) / 1024).toFixed(1)} GB</p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/70 p-5 shadow-sm">
            <p className="text-sm text-slate-400">Disk Usage</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-100">{stats?.disk.total ? `${Math.round((stats.disk.used / stats.disk.total) * 100)}%` : 'n/a'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="CPU Usage" 
          value={`${stats?.cpu.usage.toFixed(1)}%`} 
          icon={<Cpu />} 
          color="text-teal-300" 
        />
        <StatCard 
          title="Memory Usage" 
          value={`${(stats?.memory.used / 1024).toFixed(1)} / ${(stats?.memory.total / 1024).toFixed(1)} GB`} 
          icon={<Activity />} 
          color="text-sky-300" 
        />
        <StatCard 
          title="Disk Space" 
          value={`${stats?.disk.available} GB Free`} 
          icon={<HardDrive />} 
          color="text-slate-300" 
        />
        <StatCard 
          title="Uptime" 
          value={stats?.uptime || 'N/A'} 
          icon={<Thermometer />} 
          color="text-emerald-300" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[2rem] border border-slate-700/70 bg-slate-900/70 p-6 shadow-[0_20px_55px_-35px_rgba(2,6,23,0.95)] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-100">Performance History</h3>
            <select className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 outline-none">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.42}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.04}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', boxShadow: '0 16px 40px -24px rgba(2, 6, 23, 0.9)' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-700/70 bg-slate-900/70 p-6 shadow-[0_20px_55px_-35px_rgba(2,6,23,0.95)] backdrop-blur-xl">
          <h3 className="mb-6 text-lg font-bold text-slate-100">System Load</h3>
          <div className="space-y-6">
            {processes.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading process data...</div>
            ) : (
              processes.map((item) => {
                const color = 
                  item.value > 60 ? 'bg-rose-500' :
                  item.value > 30 ? 'bg-amber-500' :
                  item.value > 10 ? 'bg-sky-500' : 'bg-slate-400';
                
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-bold text-slate-100">{item.value}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(100, item.value)}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="mt-10 rounded-[1.5rem] border border-teal-500/30 bg-teal-500/10 p-4">
            <p className="text-sm text-teal-200">
              <span className="font-bold">System Status:</span> All services running normally. Resource usage within acceptable limits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
