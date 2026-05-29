
import React, { useState, useEffect, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DockerManager from './components/DockerManager';
import AsteriskManager from './components/AsteriskManager';
import AvayaManager from './components/AvayaManager';
import FileStorage from './components/FileStorage';
import BackupManager from './components/BackupManager';
import TerminalAccess from './components/TerminalAccess';
import SecurityLogs from './components/SecurityLogs';
import SystemSettings from './components/SystemSettings';
import UserManagement from './components/UserManagement';
import Notifications from './components/Notifications';
const OpenClaw = React.lazy(() => import('./components/OpenClaw'));
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Bell, ChevronRight, LogOut, User } from 'lucide-react';


class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('Admin UI error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
          <div className="max-w-xl w-full rounded-2xl border border-red-500/30 bg-red-950/30 p-6">
            <h1 className="text-2xl font-bold text-red-300 mb-3">Admin UI error</h1>
            <p className="text-slate-200 mb-2">The page crashed while loading.</p>
            <pre className="whitespace-pre-wrap text-sm text-red-200 bg-black/30 rounded-lg p-4 overflow-auto">{this.state.error || 'Unknown error'}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const tabMeta: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Dashboard', description: 'Live overview of system health and current workload.' },
  docker: { title: 'Docker Containers', description: 'Manage running containers and deployment processes.' },
  asterisk: { title: 'Asterisk PBX', description: 'Monitor telephony services and related system state.' },
  avaya: { title: 'Avaya Software', description: 'Coordinate Avaya artifacts, deployments, and package uploads.' },
  files: { title: 'Datei Upload', description: 'Transfer files and review server-side storage operations.' },
  backup: { title: 'Backup & Recovery', description: 'Create snapshots, verify archives, and restore safely.' },
  users: { title: 'User Management', description: 'Control panel access and administrative permissions.' },
  terminal: { title: 'Terminal Access', description: 'Run diagnostics and maintenance commands remotely.' },
  openclaw: { title: 'OpenClaw AI', description: 'Interact with the OpenClaw assistant directly from the admin page.' },
  security: { title: 'Security & Logs', description: 'Inspect logs, alerts, and security relevant events.' },
  settings: { title: 'System Settings', description: 'Adjust environment configuration and panel defaults.' },
};

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, login, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [systemInfo, setSystemInfo] = useState({
    osVersion: 'Loading...',
    hostname: 'Loading...'
  });

  useEffect(() => {
    // Fetch unread notifications count
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => setUnreadCount(data.unreadCount || 0))
      .catch(err => console.error('Error fetching notifications:', err));

    // Connect to WebSocket for real-time updates
    if (isAuthenticated) {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${protocol}://${window.location.host}/ws/notifications`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          setUnreadCount(prev => prev + 1);
        } else if (data.type === 'notifications_init') {
          setUnreadCount(data.data.filter((n: any) => !n.read).length);
        }
      };

      return () => {
        if (ws.readyState === 1) ws.close();
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/system/info')
        .then(res => res.json())
        .then(data => {
          setSystemInfo({
            osVersion: data.osVersion || 'Unknown',
            hostname: 'zubenko.de'
          });
        })
        .catch(err => console.error('Error fetching system info:', err));
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
  };

  const currentTab = tabMeta[activeTab] || tabMeta.dashboard;

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'docker': return <DockerManager />;
      case 'asterisk': return <AsteriskManager />;
      case 'avaya': return <AvayaManager />;
      case 'files': return <FileStorage />;
      case 'backup': return <BackupManager />;
      case 'terminal': return <TerminalAccess />;
      case 'security': return <SecurityLogs />;
      case 'settings': return <SystemSettings />;
      case 'users': return <UserManagement />;
      case 'openclaw': return <Suspense fallback={<div className="text-slate-400">Loading OpenClaw...</div>}><OpenClaw /></Suspense>;
      default: return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-transparent lg:flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Notifications Portal - Above everything */}
      {showNotifications && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-20 right-8 pointer-events-auto z-[9999]">
            <Notifications onClose={() => setShowNotifications(false)} />
          </div>
        </div>
      )}
      
      <main className="flex-1 px-4 py-4 sm:px-6 lg:ml-80 lg:px-8 lg:py-8 relative">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute left-[-8rem] top-[-5rem] h-72 w-72 rounded-full bg-teal-500/16 blur-3xl"></div>
          <div className="absolute bottom-[-6rem] right-[-2rem] h-80 w-80 rounded-full bg-sky-500/14 blur-3xl"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <header className="mb-6 rounded-[2rem] border border-slate-700/70 bg-[rgba(15,23,42,0.72)] px-5 py-5 shadow-[0_24px_70px_-35px_rgba(2,6,23,0.8)] backdrop-blur-xl sm:px-7 lg:mb-8 lg:px-8 lg:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  Admin Control Center
                  <ChevronRight className="h-3.5 w-3.5 text-teal-400" />
                  <span className="text-slate-100">{currentTab.title}</span>
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-100 sm:text-4xl">{currentTab.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">{currentTab.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">
                    {systemInfo.osVersion}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">
                    Host <span className="code-font ml-1 text-slate-100">{systemInfo.hostname}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 text-slate-300 transition hover:border-teal-500/70 hover:text-teal-300"
                  aria-label="Benachrichtigungen"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-700 px-1.5 text-[11px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 shadow-sm">
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-slate-100">Admin User</p>
                    <p className="text-xs text-slate-400">Superuser Access</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-100 shadow-sm">
                    <User className="h-5 w-5" />
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-slate-300 transition hover:border-rose-400/50 hover:text-rose-300" 
                    title="Abmelden"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <section className="relative z-10 pb-12">
            {renderContent()}
          </section>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  );
};

export default App;
