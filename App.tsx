
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DockerManager from './components/DockerManager';
import AsteriskManager from './components/AsteriskManager';
import TerminalAccess from './components/TerminalAccess';
import SecurityLogs from './components/SecurityLogs';
import SystemSettings from './components/SystemSettings';
import UserManagement from './components/UserManagement';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Bell, User, LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, login, logout } = useAuth();
  const [systemInfo, setSystemInfo] = useState({
    osVersion: 'Loading...',
    hostname: 'Loading...'
  });

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
      
      <main className="flex-1 ml-64 p-8 relative overflow-hidden">
        {/* Background blobs for aesthetics */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full"></div>

        <header className="flex items-center justify-between mb-10 relative z-10">
          <div>
            <h2 className="text-3xl font-extrabold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-slate-400 text-sm mt-1 flex items-center">
              {systemInfo.osVersion} • Host: <span className="font-mono ml-1 text-orange-400">{systemInfo.hostname}</span>
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <button className="relative p-2 text-slate-400 hover:text-white transition group">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full border-2 border-slate-950 group-hover:scale-125 transition"></span>
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
