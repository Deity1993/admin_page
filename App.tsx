
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DockerManager from './components/DockerManager';
import AsteriskManager from './components/AsteriskManager';
import AvayaManager from './components/AvayaManager';
import FileStorage from './components/FileStorage';
import TerminalAccess from './components/TerminalAccess';
import SecurityLogs from './components/SecurityLogs';
import SystemSettings from './components/SystemSettings';
import UserManagement from './components/UserManagement';
import Notifications from './components/Notifications';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Bell, User, LogOut } from 'lucide-react';

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

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'docker': return <DockerManager />;
      case 'asterisk': return <AsteriskManager />;
      case 'avaya': return <AvayaManager />;
      case 'files': return <FileStorage />;
      case 'terminal': return <TerminalAccess />;
      case 'security': return <SecurityLogs />;
      case 'settings': return <SystemSettings />;
      case 'users': return <UserManagement />;
      default: return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Notifications Portal - Above everything */}
      {showNotifications && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-20 right-8 pointer-events-auto z-[9999]">
            <Notifications onClose={() => setShowNotifications(false)} />
          </div>
        </div>
      )}
      
      <main className="flex-1 ml-64 p-8 relative">
        {/* Background blobs for aesthetics - contained */}
        <div className="fixed top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

        <header className="flex items-center justify-between mb-10 relative z-10">
          <div>
            <h2 className="text-3xl font-extrabold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-slate-400 text-sm mt-1 flex items-center">
              {systemInfo.osVersion} • Host: <span className="font-mono ml-1 text-orange-400">{systemInfo.hostname}</span>
            </p>
          </div>

          <div className="flex items-center space-x-6 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-400 hover:text-white transition group"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 bg-orange-500 rounded-full border-2 border-slate-950 text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            <div className="flex items-center space-x-4 pl-6 border-l border-slate-800">
              <div className="text-right">
                <p className="text-sm font-bold text-white">Admin User</p>
                <p className="text-xs text-slate-500">Superuser Access</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-slate-600 flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-slate-300" />
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-400 transition" 
                title="Abmelden"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <section className="relative z-10 pb-24">
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
