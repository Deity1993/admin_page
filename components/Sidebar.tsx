
import React from 'react';
import { LayoutDashboard, Box, Phone, Users, Settings, Terminal, ShieldCheck, PackageOpen, FolderUp, Database } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'docker', label: 'Docker Containers', icon: Box },
    { id: 'asterisk', label: 'Asterisk PBX', icon: Phone },
    { id: 'avaya', label: 'Avaya Software', icon: PackageOpen },
    { id: 'files', label: 'Datei Upload', icon: FolderUp },
    { id: 'backup', label: 'Backup & Recovery', icon: Database },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'terminal', label: 'Terminal Access', icon: Terminal },
    { id: 'security', label: 'Security/Logs', icon: ShieldCheck },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/20">
            <Settings className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            UbuntuAdmin
          </h1>
        </div>
        
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:text-orange-500'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6">
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">Server Status</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Healthy
            </span>
            <span className="text-xs text-slate-400">v2.4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
