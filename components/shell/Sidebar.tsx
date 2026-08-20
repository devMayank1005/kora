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
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sliders,
  HelpCircle,
  BarChart3,
  Building2,
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
    { label: 'Clients', href: '/integrations', icon: Building2 },
    { label: 'Reports', href: '/', icon: BarChart3 },
  ];

  const adminNav = [
    { label: 'Administration', href: '/admin', icon: ShieldCheck, adminOnly: true },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-[#c3c7cf]/40 bg-[#eff4ff]/60 transition-all duration-200 dark:border-slate-800 dark:bg-[#0e1726] ${
        sidebarCollapsed ? 'w-14 min-w-[56px]' : 'w-58 min-w-[232px]'
      }`}
    >
      {/* Brand Header (64px fixed) */}
      <div className="flex h-16 items-center justify-between px-3.5 border-b border-[#c3c7cf]/30 dark:border-slate-800">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0e7490] text-xs font-bold text-white shadow-2xs">
              K
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight text-[#1a1c1e] dark:text-white uppercase">
                Kognoz
              </span>
              <span className="ml-1 text-xs font-semibold text-[#0e7490]">/ Kora</span>
            </div>
          </Link>
        )}

        {sidebarCollapsed && (
          <Link href="/" className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-[#0e7490] text-xs font-bold text-white">
            K
          </Link>
        )}

        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-[#73777f] hover:bg-[#e1e9f6] hover:text-[#1a1c1e] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
        {/* Overview link */}
        <Link
          href="/"
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
            pathname === '/'
              ? 'bg-[#0e7490] text-white font-semibold shadow-2xs'
              : 'text-[#43474e] hover:bg-[#e1e9f6]/70 dark:text-slate-300 dark:hover:bg-slate-800/60'
          }`}
          title="Dashboard Overview"
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Dashboard</span>}
        </Link>

        {/* Section 1: Delivery */}
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#73777f] dark:text-slate-400">
              Delivery
            </div>
          )}
          {deliveryNav.map(item => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0e7490] text-white font-semibold shadow-2xs'
                    : 'text-[#43474e] hover:bg-[#e1e9f6]/70 dark:text-slate-300 dark:hover:bg-slate-800/60'
                }`}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Section 2: Management */}
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#73777f] dark:text-slate-400">
              Management
            </div>
          )}
          {managementNav.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#43474e] hover:bg-[#e1e9f6]/70 dark:text-slate-300 dark:hover:bg-slate-800/60 transition-colors"
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Section 3: Administration */}
        {userRole === 'admin' && (
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#73777f] dark:text-slate-400">
                Administration
              </div>
            )}
            {adminNav.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0e7490] text-white font-semibold shadow-2xs'
                      : 'text-[#43474e] hover:bg-[#e1e9f6]/70 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Profile & Logout */}
      <div className="border-t border-[#c3c7cf]/30 p-2.5 dark:border-slate-800 space-y-1">
        <div className="flex items-center justify-between px-2 py-1.5 text-xs">
          {!sidebarCollapsed && (
            <div className="truncate pr-2">
              <div className="font-semibold text-[#1a1c1e] dark:text-white truncate">{userName}</div>
              <div className="text-[10px] uppercase font-mono text-[#73777f]">{userRole}</div>
            </div>
          )}
          <button
            onClick={onLogout}
            className="rounded-md p-1.5 text-[#73777f] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
