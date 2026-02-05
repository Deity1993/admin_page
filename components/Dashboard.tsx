
import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';
import { Cpu, HardDrive, Activity, Thermometer, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const API_BASE = window.location.origin;

interface SystemStats {
  cpu: { usage: number; temp: number | null };
  memory: { total: number; used: number; free: number; percent: number };
  disk: { total: number; used: number; available: number };
  uptime: string;
}

const MOCK_DATA = [
  { name: '00:00', cpu: 32, ram: 45 },
  { name: '04:00', cpu: 28, ram: 42 },
  { name: '08:00', cpu: 45, ram: 50 },
  { name: '12:00', cpu: 78, ram: 85 },
  { name: '16:00', cpu: 55, ram: 65 },
  { name: '20:00', cpu: 40, ram: 55 },
  { name: '23:59', cpu: 35, ram: 48 },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; trend?: number }> = ({ title, value, icon, color, trend }) => (
  <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-xl">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        {trend !== undefined && (
          <div className={`flex items-center mt-2 text-xs font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}% from last hour
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl bg-slate-900/50 border border-slate-700 ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/system/stats`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center text-slate-400">Loading system stats...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="CPU Usage" 
          value={`${stats?.cpu.usage.toFixed(1)}%`} 
          icon={<Cpu />} 
          color="text-orange-500" 
        />
        <StatCard 
          title="Memory Usage" 
          value={`${(stats?.memory.used / 1024).toFixed(1)} / ${(stats?.memory.total / 1024).toFixed(1)} GB`} 
          icon={<Activity />} 
          color="text-blue-500" 
        />
        <StatCard 
          title="Disk Space" 
          value={`${stats?.disk.available} GB Free`} 
          icon={<HardDrive />} 
          color="text-purple-500" 
        />
        <StatCard 
          title="Uptime" 
          value={stats?.uptime || 'N/A'} 
          icon={<Thermometer />} 
          color="text-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Performance History</h3>
            <select className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 outline-none">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DATA}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-xl">
          <h3 className="text-lg font-bold mb-6">System Load</h3>
          <div className="space-y-6">
            {[
              { label: 'n8n Workflow', value: 85, color: 'bg-orange-500' },
              { label: 'Asterisk Engine', value: 45, color: 'bg-blue-500' },
              { label: 'Custom Node App', value: 62, color: 'bg-purple-500' },
              { label: 'System Kernel', value: 12, color: 'bg-slate-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="font-bold">{item.value}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-10 p-4 bg-orange-900/20 border border-orange-500/30 rounded-2xl">
            <p className="text-sm text-orange-200">
              <span className="font-bold">System Notice:</span> n8n CPU spikes detected. Consider increasing resource limits for the container.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
