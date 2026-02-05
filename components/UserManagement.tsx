import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Lock, Check, X, Search } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  created: string;
  lastLogin: string | null;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [passwordData, setPasswordData] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email) {
      setMessage({ type: 'error', text: 'Username and email are required' });
      return;
    }

    try {
      let response;
      
      if (editingId) {
        // Update user
        response = await fetch(`/api/users/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            role: formData.role
          })
        });
      } else {
        // Create new user
        if (!formData.password) {
          setMessage({ type: 'error', text: 'Password is required for new users' });
          return;
        }
        
        response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setFormData({ username: '', email: '', password: '', role: 'user' });
        setEditingId(null);
        setShowForm(false);
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Operation failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Operation failed' });
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleChangePassword = async (userId: string) => {
    if (!passwordData) {
      setMessage({ type: 'error', text: 'Password cannot be empty' });
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordData })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setPasswordData('');
        setShowPasswordForm(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to change password' });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete user' });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ username: '', email: '', password: '', role: 'user' });
  };

  const filtered = users.filter(user =>
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center text-slate-400">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Users className="mr-3 text-purple-500" />
            User Management
          </h2>
          <p className="text-slate-400 text-sm">Manage application users and permissions</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm transition shadow-lg shadow-green-900/20"
        >
          <Plus className="w-4 h-4" />
          <span>New User</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-200'
            : 'bg-red-500/10 border-red-500/20 text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            {editingId ? 'Edit User' : 'Create New User'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  required
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition text-sm font-semibold"
              >
                {editingId ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-white"
        />
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
              <th className="px-6 py-4">Username</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Login</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-slate-700/30 transition-colors group">
                <td className="px-6 py-4 font-semibold text-white">{user.username}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-green-400/10 text-green-400'
                      : 'bg-red-400/10 text-red-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                      user.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('de-DE') : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => setShowPasswordForm(user.id)}
                      className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition"
                      title="Change password"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-orange-400 hover:bg-orange-400/10 rounded-lg transition"
                      title="Edit user"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPasswordForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-300 mb-2">New Password</label>
              <input
                type="password"
                value={passwordData}
                onChange={(e) => setPasswordData(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                placeholder="Enter new password"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleChangePassword(showPasswordForm)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition text-sm font-semibold flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Change</span>
              </button>
              <button
                onClick={() => setShowPasswordForm(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm font-semibold flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
