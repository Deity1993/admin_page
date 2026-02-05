import React, { useState } from 'react';
import { Settings, Save, Server, Network, Database, Bell, Mail, Key, Globe, Clock } from 'lucide-react';

interface SettingSection {
  title: string;
  icon: any;
  settings: Setting[];
}

interface Setting {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'input' | 'select';
  value: any;
  options?: string[];
}

const SystemSettings: React.FC = () => {
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({
    // Server Settings
    serverName: 'zubenko.de',
    timezone: 'Europe/Berlin',
    autoUpdate: true,
    
    // Network Settings
    sshPort: '22',
    maxConnections: '100',
    enableIPv6: false,
    
    // Notifications
    emailNotifications: true,
    slackWebhook: '',
    alertThreshold: '80',
    
    // Security
    sessionTimeout: '8',
    requireStrongPassword: true,
    twoFactorAuth: false,
    
    // Backup
    autoBackup: true,
    backupInterval: 'daily',
    backupRetention: '30',
  });

  const handleChange = (id: string, value: any) => {
    setSettings(prev => ({ ...prev, [id]: value }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    // In production: send to API
    console.log('Saving settings:', settings);
    setHasChanges(false);
    alert('Settings saved successfully!');
  };

  const resetSettings = () => {
    if (confirm('Reset all settings to default?')) {
      // Reset to defaults
      setHasChanges(false);
    }
  };

  const sections: SettingSection[] = [
    {
      title: 'Server Configuration',
      icon: Server,
      settings: [
        {
          id: 'serverName',
          label: 'Server Name',
          description: 'Hostname for this server',
          type: 'input',
          value: settings.serverName,
        },
        {
          id: 'timezone',
          label: 'Timezone',
          description: 'Server timezone for logs and scheduling',
          type: 'select',
          value: settings.timezone,
          options: ['Europe/Berlin', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'UTC'],
        },
        {
          id: 'autoUpdate',
          label: 'Automatic Updates',
          description: 'Enable automatic security updates',
          type: 'toggle',
          value: settings.autoUpdate,
        },
      ],
    },
    {
      title: 'Network Settings',
      icon: Network,
      settings: [
        {
          id: 'sshPort',
          label: 'SSH Port',
          description: 'Port for SSH connections (requires restart)',
          type: 'input',
          value: settings.sshPort,
        },
        {
          id: 'maxConnections',
          label: 'Max Connections',
          description: 'Maximum simultaneous connections',
          type: 'input',
          value: settings.maxConnections,
        },
        {
          id: 'enableIPv6',
          label: 'Enable IPv6',
          description: 'Allow IPv6 network connections',
          type: 'toggle',
          value: settings.enableIPv6,
        },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        {
          id: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Send alerts via email',
          type: 'toggle',
          value: settings.emailNotifications,
        },
        {
          id: 'slackWebhook',
          label: 'Slack Webhook URL',
          description: 'Webhook for Slack notifications',
          type: 'input',
          value: settings.slackWebhook,
        },
        {
          id: 'alertThreshold',
          label: 'Alert Threshold (%)',
          description: 'CPU/RAM usage threshold for alerts',
          type: 'input',
          value: settings.alertThreshold,
        },
      ],
    },
    {
      title: 'Security',
      icon: Key,
      settings: [
        {
          id: 'sessionTimeout',
          label: 'Session Timeout (hours)',
          description: 'Auto-logout after inactivity',
          type: 'input',
          value: settings.sessionTimeout,
        },
        {
          id: 'requireStrongPassword',
          label: 'Require Strong Passwords',
          description: 'Enforce password complexity rules',
          type: 'toggle',
          value: settings.requireStrongPassword,
        },
        {
          id: 'twoFactorAuth',
          label: 'Two-Factor Authentication',
          description: 'Require 2FA for admin login',
          type: 'toggle',
          value: settings.twoFactorAuth,
        },
      ],
    },
    {
      title: 'Backup & Recovery',
      icon: Database,
      settings: [
        {
          id: 'autoBackup',
          label: 'Automatic Backups',
          description: 'Enable scheduled backups',
          type: 'toggle',
          value: settings.autoBackup,
        },
        {
          id: 'backupInterval',
          label: 'Backup Interval',
          description: 'How often to create backups',
          type: 'select',
          value: settings.backupInterval,
          options: ['hourly', 'daily', 'weekly', 'monthly'],
        },
        {
          id: 'backupRetention',
          label: 'Backup Retention (days)',
          description: 'How long to keep old backups',
          type: 'input',
          value: settings.backupRetention,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="mr-3 text-purple-500" />
            System Settings
          </h2>
          <p className="text-slate-400 text-sm">Configure server and application settings</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={resetSettings}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition border border-slate-700"
          >
            Reset to Default
          </button>
          <button
            onClick={saveSettings}
            disabled={!hasChanges}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm transition ${
              hasChanges
                ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center space-x-3">
          <Bell className="w-5 h-5 text-yellow-400" />
          <p className="text-sm text-yellow-200">You have unsaved changes. Click "Save Changes" to apply them.</p>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {sections.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <div key={sectionIndex} className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden">
              <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700/50">
                <h3 className="font-bold text-white flex items-center">
                  <Icon className="w-5 h-5 mr-2 text-purple-400" />
                  {section.title}
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                {section.settings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-semibold text-white block mb-1">
                        {setting.label}
                      </label>
                      <p className="text-xs text-slate-400">{setting.description}</p>
                    </div>
                    
                    <div className="ml-6">
                      {setting.type === 'toggle' && (
                        <button
                          onClick={() => handleChange(setting.id, !setting.value)}
                          className={`relative w-12 h-6 rounded-full transition ${
                            setting.value ? 'bg-green-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition transform ${
                              setting.value ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      )}
                      
                      {setting.type === 'input' && (
                        <input
                          type="text"
                          value={setting.value}
                          onChange={(e) => handleChange(setting.id, e.target.value)}
                          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm w-48"
                        />
                      )}
                      
                      {setting.type === 'select' && (
                        <select
                          value={setting.value}
                          onChange={(e) => handleChange(setting.id, e.target.value)}
                          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm w-48"
                        >
                          {setting.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* System Information */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-blue-400" />
          System Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase">OS Version</p>
            <p className="text-sm font-semibold text-white">Ubuntu 24.04.3 LTS</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Kernel</p>
            <p className="text-sm font-semibold text-white">5.15.0-91-generic</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Node.js</p>
            <p className="text-sm font-semibold text-white">v20.20.0</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Uptime</p>
            <p className="text-sm font-semibold text-white">1 day, 17 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
