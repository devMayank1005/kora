'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import {
  LayoutDashboard,
  Boxes,
  KanbanSquare,
  Headphones,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';

interface SidebarProps {
  userRole?: 'admin' | 'editor' | 'viewer';
  userName?: string;
  onLogout?: () => void;
}

export function Sidebar({ userRole = 'admin', userName = 'User', onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, theme, setTheme } = useUIStore();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Integrations', href: '/integrations', icon: Boxes },
    { label: 'Implementation', href: '/implementation', icon: KanbanSquare },
    { label: 'AMS & Support', href: '/ams', icon: Headphones },
  ];

  if (userRole === 'admin') {
    navItems.push({ label: 'Admin & Logs', href: '/admin', icon: ShieldCheck });
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside
      className={`sticky top-0 z-30 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 ease-out dark:border-slate-800 dark:bg-slate-900 ${
        sidebarCollapsed ? 'w-[56px]' : 'w-[232px]'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-100 px-3.5 dark:border-slate-800">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0e7490] text-xs font-bold text-white shadow-xs">
              K
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Kora
              </span>
              <span className="text-[10px] font-medium text-slate-400">by Kognoz</span>
            </div>
          </div>
        )}

        {sidebarCollapsed && (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-[#0e7490] text-xs font-bold text-white shadow-xs">
            K
          </div>
        )}

        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#0e7490]/10 text-[#0e7490] font-semibold dark:bg-[#0e7490]/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
              } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info & Theme */}
      <div className="border-t border-slate-100 p-2 dark:border-slate-800">
        <div
          className={`flex items-center gap-2 rounded-xl p-1.5 ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!sidebarCollapsed && (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
