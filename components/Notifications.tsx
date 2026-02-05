import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  component?: string;
}

interface NotificationsProps {
  onClose?: () => void;
}

const NotificationItem: React.FC<{ notification: Notification; onDelete: (id: string) => void; onMarkRead: (id: string) => void }> = ({ notification, onDelete, onMarkRead }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-slate-800/40 border-slate-700/50';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`p-4 rounded-lg border ${getBackgroundColor()} flex items-start space-x-3 group transition`}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white text-sm">{notification.title}</h4>
        <p className="text-slate-400 text-xs mt-1">{notification.message}</p>
        <p className="text-slate-500 text-xs mt-2">{formatTime(notification.timestamp)}</p>
      </div>

      <div className="flex-shrink-0 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
        {!notification.read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="p-1 hover:bg-slate-700 rounded transition"
            title="Mark as read"
          >
            <Check className="w-4 h-4 text-slate-400" />
          </button>
        )}
        <button
          onClick={() => onDelete(notification.id)}
          className="p-1 hover:bg-slate-700 rounded transition"
          title="Delete"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
};

const Notifications: React.FC<NotificationsProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial notifications
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(err => console.error('Error fetching notifications:', err))
      .finally(() => setLoading(false));

    // Connect to WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/notifications`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notifications_init') {
        setNotifications(data.data || []);
        setUnreadCount(data.data.filter((n: Notification) => !n.read).length);
      } else if (data.type === 'notification') {
        setNotifications(prev => [data.data, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };

    ws.onerror = (err) => console.error('WebSocket error:', err);

    return () => {
      if (ws.readyState === 1) ws.close();
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - (notifications.find(n => n.id === id)?.read ? 0 : 1)));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch('/api/notifications', { method: 'DELETE' });
      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  return (
    <div className="w-96 bg-slate-900/95 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-slate-800/50 border-b border-slate-700/50 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className="font-bold text-white">Notifications</h3>
            <p className="text-xs text-slate-400">{unreadCount} unread</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-slate-400">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDelete={handleDelete}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-slate-700/50 p-4 bg-slate-800/30">
          <button
            onClick={handleClearAll}
            className="w-full py-2 px-4 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
