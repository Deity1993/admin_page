
import React, { useState } from 'react';
import { Phone, CheckCircle, XCircle, Search, UserPlus, FileText, Settings, Activity } from 'lucide-react';
import { AsteriskUser } from '../types';

const MOCK_AST_USERS: AsteriskUser[] = [
  { username: '1001', status: 'Online', ip: '192.168.1.45', lastUsed: '2 mins ago' },
  { username: '1002', status: 'Offline', ip: '-', lastUsed: '14 hours ago' },
  { username: '1003', status: 'Online', ip: '192.168.1.12', lastUsed: 'Just now' },
  { username: '9000', status: 'Offline', ip: '-', lastUsed: '3 days ago' },
];

const AsteriskManager: React.FC = () => {
  const [users, setUsers] = useState(MOCK_AST_USERS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Phone className="mr-3 text-blue-500" />
            Asterisk SIP/WSS Manager
          </h2>
          <p className="text-slate-400 text-sm">Manage extensions and monitor real-time registration status.</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center border border-slate-700">
            <FileText className="w-4 h-4 mr-2" />
            View logs
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center shadow-lg shadow-blue-900/20 transition">
            <UserPlus className="w-4 h-4 mr-2" />
            New Extension
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Active Calls</span>
            {/* Fixed: Added 'Activity' to lucide-react imports */}
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold">4</div>
        </div>
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Registered WSS</span>
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold">2 / 4</div>
        </div>
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Server Latency</span>
            <Settings className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold">12ms</div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="font-bold">Extensions Overview</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search user..."
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Extension</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Last Interaction</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {users.map((user) => (
                <tr key={user.username} className="hover:bg-slate-700/30 transition">
                  <td className="px-6 py-4">
                    <span className="font-bold text-white">Ext. {user.username}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-2 ${user.status === 'Online' ? 'text-green-400' : 'text-slate-500'}`}>
                      {user.status === 'Online' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span className="text-sm font-medium">{user.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                    {user.ip}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {user.lastUsed}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-slate-400 hover:text-white p-2">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300 p-2">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AsteriskManager;
