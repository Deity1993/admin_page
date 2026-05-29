import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string) => boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = onLogin(username, password);
    if (!success) {
      setError('Ungueltiger Benutzername oder Passwort');
      setPassword('');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-teal-300/25 blur-3xl"></div>
        <div className="absolute bottom-[-8rem] right-[-3rem] h-80 w-80 rounded-full bg-sky-300/20 blur-3xl"></div>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 rounded-[2rem] border border-white/70 bg-white/55 p-4 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr] lg:p-6">
        <section className="rounded-[1.75rem] bg-slate-950 px-6 py-8 text-white sm:px-8 sm:py-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
              Admin Control Center
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">Schlanker Zugriff auf deinen Serverbetrieb.</h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Ein reduziertes Interface fuer Deployments, Monitoring, Backups und Diagnose. Klarer aufgebaut, schneller zu scannen und ohne visuelle Unruhe.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Status</p>
                <p className="mt-2 text-2xl font-bold text-white">Live</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Bereiche</p>
                <p className="mt-2 text-2xl font-bold text-white">10+</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Modus</p>
                <p className="mt-2 text-2xl font-bold text-white">Secure</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-900/20">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">Anmelden</h2>
            <p className="mt-2 text-sm text-slate-500">Melde dich an, um die Serververwaltung zu oeffnen.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">
                Benutzername
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-3 text-slate-950 placeholder-slate-400 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  placeholder="Benutzername eingeben"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                Passwort
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-3 text-slate-950 placeholder-slate-400 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  placeholder="Passwort eingeben"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              Anmelden
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Server Administration Panel v1.0
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
