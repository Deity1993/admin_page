import React, { useState, useEffect } from 'react';
import { Shield, Activity, AlertTriangle, Lock, Eye, EyeOff, Download, RefreshCw, Filter } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  ip?: string;
}

interface SecurityMetric {
  label: string;
  value: number;
  status: 'success' | 'warning' | 'danger';
}

const SecurityLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    failedLogins: 0,
    activeSessions: 0,
    firewallBlocks: 0,
    securityAlerts: 0
  });

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('level', filter);
      params.append('limit', '100');

      const response = await fetch(`/api/security/logs?${params}`);
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/security/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLogs(), fetchMetrics()]);
      setLoading(false);
    };

    loadData();
  }, [filter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchMetrics();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filter]);

  const metricsDisplay: SecurityMetric[] = [
    { label: 'Failed Login Attempts', value: metrics.failedLogins, status: metrics.failedLogins > 5 ? 'warning' : 'success' },
    { label: 'Active Sessions', value: metrics.activeSessions, status: 'success' },
    { label: 'Firewall Blocks', value: metrics.firewallBlocks, status: metrics.firewallBlocks > 100 ? 'danger' : 'warning' },
    { label: 'Security Alerts', value: metrics.securityAlerts, status: metrics.securityAlerts > 0 ? 'danger' : 'success' },
  ];

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const refreshLogs = () => {
    setLoading(true);
    Promise.all([fetchLogs(), fetchMetrics()]).finally(() => {
      setLoading(false);
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'critical': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'danger': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Shield className="mr-3 text-blue-500" />
            Security & Logs
          </h2>
          <p className="text-slate-400 text-sm">Monitor system security and application logs</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={refreshLogs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm transition border ${
              autoRefresh 
                ? 'bg-green-600 hover:bg-green-500 border-green-500' 
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
          >
            {autoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm transition">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {metricsDisplay.map((metric, index) => (
          <div key={index} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">{metric.label}</span>
              <Activity className={`w-4 h-4 ${getMetricColor(metric.status)}`} />
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">{metric.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 bg-slate-800/40 p-2 rounded-xl border border-slate-700/50">
        <Filter className="w-4 h-4 text-slate-500 ml-2" />
        {['all', 'info', 'warning', 'error', 'critical'].map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-4 py-2 rounded-lg text-sm transition capitalize ${
              filter === level
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No logs found for selected filter
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-blue-400">{log.service}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      {log.ip || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <Lock className="w-5 h-5 mr-2 text-yellow-400" />
          Security Recommendations
        </h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Enable Two-Factor Authentication</p>
              <p className="text-xs text-slate-400">Add an extra layer of security to admin accounts</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700">
            <Shield className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Firewall Active</p>
              <p className="text-xs text-slate-400">UFW firewall is protecting your server</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700">
            <Activity className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Regular Security Audits</p>
              <p className="text-xs text-slate-400">Last audit: 2 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityLogs;
