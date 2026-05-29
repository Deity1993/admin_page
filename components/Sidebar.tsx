
import React from 'react';
import { Box, Database, FolderUp, LayoutDashboard, MessageSquare, PackageOpen, Phone, Settings, ShieldCheck, Terminal, Users } from 'lucide-react';

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
    { id: 'openclaw', label: 'OpenClaw AI', icon: MessageSquare },
    { id: 'security', label: 'Security/Logs', icon: ShieldCheck },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const primaryItems = menuItems.slice(0, 6);
  const secondaryItems = menuItems.slice(6);

  const renderItem = (item: typeof menuItems[number]) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
          isActive
            ? 'bg-slate-950 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.8)]'
            : 'text-slate-600 hover:bg-white hover:text-slate-950'
        }`}
      >
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isActive ? 'border-white/10 bg-white/10' : 'border-slate-200 bg-slate-50 group-hover:border-teal-100 group-hover:bg-teal-50'}`}>
          <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-700'}`} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight">{item.label}</span>
        </span>
      </button>
    );
  };

  return (
    <aside className="fixed inset-x-0 top-0 z-20 border-b border-white/60 bg-[rgba(255,255,255,0.78)] px-4 py-4 backdrop-blur-xl lg:inset-y-0 lg:left-0 lg:right-auto lg:h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-6 lg:py-6">
      <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.72)] p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.4)] lg:p-5">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-200/80 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Remote Ops</p>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-950">Admin Center</h1>
          </div>
        </div>

        <div className="hidden lg:block">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Core</p>
          <nav className="space-y-2">{primaryItems.map(renderItem)}</nav>
        </div>

        <div className="mt-6 hidden lg:block">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Tools</p>
          <nav className="space-y-2">{secondaryItems.map(renderItem)}</nav>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition ${isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white/80 text-slate-600'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-auto rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-slate-50">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Server Status</p>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">Healthy</p>
              <p className="mt-1 text-sm text-slate-300">Control plane available</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-teal-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.9)]"></span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-sm text-slate-300">
            <span>Build</span>
            <span className="code-font text-slate-100">v2.4.0</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
            <span>Theme</span>
            <span className="text-slate-100">Modern Calm</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
