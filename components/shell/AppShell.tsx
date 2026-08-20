'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { RolePreviewBanner } from './RolePreviewBanner';
import { CommandPalette } from './CommandPalette';
import { useUIStore } from '@/stores/uiStore';
import { getStoredSession, clearStoredSession } from '@/lib/api-client';
import { UserRole } from '@/types';
import { Search, Sun, Moon } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { setCommandPaletteOpen, theme, setTheme } = useUIStore();
  const [userName, setUserName] = useState<string>('User');
  const [userRole, setUserRole] = useState<UserRole>('admin');

  useEffect(() => {
    const sess = getStoredSession();
    if (sess?.user) {
      setUserName(sess.user.name || sess.user.username);
      setUserRole(sess.user.role || 'admin');
    }
  }, []);

  const handleLogout = () => {
    clearStoredSession();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#090d16] dark:text-slate-100 transition-colors duration-200">
      <Sidebar userRole={userRole} userName={userName} onLogout={handleLogout} />

      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <RolePreviewBanner />
        <CommandPalette />

        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800/70 dark:bg-[#090d16]/80 transition-colors">
          <Breadcrumbs />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-1.5 text-xs text-slate-500 hover:border-cyan-500/40 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-cyan-500/40 transition-all shadow-2xs"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Search anything…</span>
              <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white shadow-2xs transition-all"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>
          </div>
        </header>

        {/* Main Viewport Container */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
