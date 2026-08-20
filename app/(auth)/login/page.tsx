'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogin } from '@/lib/api-client';
import { useUIStore } from '@/stores/uiStore';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useUIStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await apiLogin(username.trim(), password);
      showToast('Signed in successfully', 'success');
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid username or password.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0e7490] text-xl font-bold text-white shadow-sm">
            K
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign in to Kora
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Client Delivery, Integrations & Governance by Kognoz
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Username
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. yashwanth"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pl-10 text-xs font-medium text-slate-900 focus:border-[#0e7490] focus:ring-2 focus:ring-[#0e7490]/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pl-10 pr-10 text-xs font-medium text-slate-900 focus:border-[#0e7490] focus:ring-2 focus:ring-[#0e7490]/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center rounded-xl bg-[#0e7490] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0e7490]/90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-400 dark:bg-slate-900">or</span>
          </div>
        </div>

        <a
          href="/api/auth-microsoft"
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          <span>Sign in with Microsoft 365</span>
        </a>
      </div>
    </div>
  );
}
