'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { UserRole } from '@/types';
import {
  LayoutDashboard,
  Boxes,
  KanbanSquare,
  Headphones,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  BarChart3,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
}

export function Sidebar({ userRole, userName, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const deliveryNav = [
    { label: 'Integrations', href: '/integrations', icon: Boxes },
    { label: 'Implementation', href: '/implementation', icon: KanbanSquare },
    { label: 'AMS & Support', href: '/ams', icon: Headphones },
  ];

  const managementNav = [
    { label: 'Client Accounts', href: '/integrations', icon: Building2 },
    { label: 'Reports & Export', href: '/', icon: BarChart3 },
  ];

  const adminNav = [
    { label: 'Administration', href: '/admin', icon: ShieldCheck, adminOnly: true },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200/70 bg-white dark:border-slate-800/80 dark:bg-[#0b101d] transition-all duration-300 ${
        sidebarCollapsed ? 'w-16 min-w-[64px]' : 'w-60 min-w-[240px]'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/60">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0891b2] to-[#06b6d4] text-white font-bold text-sm shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              K
            </div>
            <div>
              <div className="text-xs font-extrabold tracking-wider text-slate-900 dark:text-white uppercase flex items-center gap-1">
                <span>Kora</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
              </div>
              <div className="text-[10px] font-medium text-slate-400">Operations Hub</div>
            </div>
          </Link>
        )}

        {sidebarCollapsed && (
          <Link href="/" className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0891b2] to-[#06b6d4] text-white font-bold text-sm shadow-md shadow-cyan-500/20">
            K
          </Link>
        )}

        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {/* Main Overview */}
        <Link
          href="/"
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
            pathname === '/'
              ? 'bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white shadow-md shadow-cyan-500/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
          }`}
          title="Dashboard"
        >
          <LayoutDashboard className={`h-4 w-4 shrink-0 ${pathname === '/' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white'}`} />
          {!sidebarCollapsed && <span>Dashboard Overview</span>}
        </Link>

        {/* Section 1: Delivery Tracks */}
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Delivery Tracks
            </div>
          )}
          {deliveryNav.map(item => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                }`}
                title={item.label}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white'}`} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Section 2: Management */}
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Management
            </div>
          )}
          {managementNav.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white transition-all"
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Section 3: Governance */}
        {userRole === 'admin' && (
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Governance
              </div>
            )}
            {adminNav.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white shadow-md shadow-cyan-500/20'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  }`}
                  title={item.label}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white'}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-slate-100 p-3 dark:border-slate-800/60">
        <div className="flex items-center justify-between rounded-xl bg-slate-50/80 p-2 dark:bg-slate-800/40">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0 pr-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0891b2]/10 text-[#0891b2] font-bold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{userName}</div>
                <div className="text-[10px] font-mono uppercase text-slate-400">{userRole}</div>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
