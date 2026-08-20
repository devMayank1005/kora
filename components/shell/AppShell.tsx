'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { RolePreviewBanner } from './RolePreviewBanner';
import { getStoredSession, clearStoredSession } from '@/lib/api-client';
import { UserRole } from '@/types';
import { Search, Bell } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
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
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar userRole={userRole} userName={userName} onLogout={handleLogout} />

      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <RolePreviewBanner />

        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
          <Breadcrumbs />

          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
              onClick={() => {}}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search clients, tickets…</span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                ⌘K
              </kbd>
            </button>

            <button
              className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
