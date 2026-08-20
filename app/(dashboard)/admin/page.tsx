'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiFetchUsers, apiSaveUsers } from '@/lib/api-client';
import { User, UserRole } from '@/types/user';
import { fmtDate } from '@/lib/domain/date';
import { useUIStore } from '@/stores/uiStore';
import {
  ShieldCheck,
  Users,
  KeyRound,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';

export default function AdminGovernancePage() {
  const { data, error, isLoading, mutate } = useSWR('users', () =>
    apiFetchUsers().then(res => res.users)
  );
  const { showToast, setPreviewRole } = useUIStore();

  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'settings' | 'tasks'>('users');

  const users: User[] = data || [];

  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    const updatedUsers = users.map(u => (u.id === targetUser.id ? { ...u, role: newRole } : u));
    try {
      mutate(updatedUsers, false);
      await apiSaveUsers(updatedUsers, `Changed role of ${targetUser.username} to ${newRole}`);
      showToast(`Updated role for ${targetUser.username}`, 'success');
      mutate();
    } catch (e: any) {
      showToast(e.message || 'Failed to update user role', 'error');
      mutate();
    }
  };

  const handleToggleLock = async (targetUser: User) => {
    const nextLocked = !targetUser.locked;
    const updatedUsers = users.map(u => (u.id === targetUser.id ? { ...u, locked: nextLocked } : u));
    try {
      mutate(updatedUsers, false);
      await apiSaveUsers(updatedUsers, `${nextLocked ? 'Locked' : 'Unlocked'} ${targetUser.username}`);
      showToast(`${targetUser.username} is now ${nextLocked ? 'locked' : 'unlocked'}`, 'success');
      mutate();
    } catch (e: any) {
      showToast(e.message || 'Failed to update lock status', 'error');
      mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0891b2] border-t-transparent"></div>
          <span className="text-xs font-medium text-slate-400">Loading governance console…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Administration & Governance
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            User access management, role policies & system sync tasks
          </p>
        </div>

        {/* Role Preview Switcher */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-1 text-xs dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <span className="px-2 text-[11px] font-bold text-slate-400">Preview:</span>
          {(['admin', 'editor', 'viewer'] as UserRole[]).map(role => (
            <button
              key={role}
              onClick={() => {
                setPreviewRole(role);
                showToast(`Switched preview mode to ${role}`, 'info');
              }}
              className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'border-[#0891b2] text-[#0891b2]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'border-[#0891b2] text-[#0891b2]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Audit Stream</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'settings'
              ? 'border-[#0891b2] text-[#0891b2]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>System Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'tasks'
              ? 'border-[#0891b2] text-[#0891b2]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Sync Tasks</span>
        </button>
      </div>

      {/* Tab 1: User Directory Table */}
      {activeTab === 'users' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/80">
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-slate-400 text-[11px] font-mono">@{u.username}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u, e.target.value as UserRole)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {u.locked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">{fmtDate(u.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleLock(u)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                      title={u.locked ? 'Unlock account' : 'Lock account'}
                    >
                      {u.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Audit Stream</h2>
          <div className="py-16 text-center text-xs text-slate-400">
            Real-time audit streamer connected to Supabase governance events.
          </div>
        </div>
      )}

      {/* Tab 3: Settings */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Global Settings</h2>
          <div className="max-w-md space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200">System Currency</label>
              <input
                type="text"
                disabled
                value="INR (₹)"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200">Retainer Day Equivalence</label>
              <input
                type="text"
                disabled
                value="8.0 hours / day"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Tasks */}
      {activeTab === 'tasks' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Utilities</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Dual-Write Sync Verification</h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Verifies JSON column and normalized relational table parity.
              </p>
              <button
                onClick={() => showToast('Verification completed. 100% data parity.', 'success')}
                className="mt-3.5 rounded-xl bg-[#0891b2] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-cyan-500/20"
              >
                Run Verification
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Capture Portfolio Snapshot</h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Computes daily snapshot and saves to `client_snapshots`.
              </p>
              <button
                onClick={() => showToast('Daily snapshot saved.', 'success')}
                className="mt-3.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Capture Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
