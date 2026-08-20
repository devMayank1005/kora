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
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#090d16] dark:text-slate-100">
      <Sidebar userRole={userRole} userName={userName} onLogout={handleLogout} />

      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <RolePreviewBanner />
        <CommandPalette />

        {/* Top Header Bar (Fixed 64px) */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#c3c7cf]/30 bg-[#ffffff]/90 px-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0e1726]/90">
          <Breadcrumbs />

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Quick search…</span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.2 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </header>

        {/* Main Viewport Container */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
