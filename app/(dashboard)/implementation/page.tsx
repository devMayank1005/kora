'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiFetchClients } from '@/lib/api-client';
import { Client, ImplementationModule, Phase, PhaseStatus } from '@/types/client';
import { implAutoRag } from '@/lib/domain/rag';
import { fmtDate, daysDiff, isOverdueDate } from '@/lib/domain/date';
import { useUIStore } from '@/stores/uiStore';
import {
  KanbanSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Calendar,
  Layers,
} from 'lucide-react';

const STANDARD_PHASES = [
  'CRP',
  'CRP2',
  'UAT',
  'Integration',
  'Parallel Run',
  'Go-Live',
  'Hypercare',
  'Phase 1 Signoff',
  'Phase 2 Signoff',
];

export default function ImplementationPage() {
  const { data, error, isLoading } = useSWR('clients', () =>
    apiFetchClients().then(res => res.clients)
  );
  const { showToast } = useUIStore();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const clients: Client[] = data || [];
  const implClients = clients.filter(c => (c.modules || []).length > 0);
  const activeClient =
    implClients.find(c => c.id === selectedClientId) || implClients[0] || clients[0];

  const modules = activeClient?.modules || [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0e7490] border-t-transparent"></div>
          <span className="text-xs text-slate-400">Loading implementation matrices…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Implementation Tracker</h1>
          <p className="text-xs text-slate-500">Track 9-phase rollouts, sign-offs & milestone attachments</p>
        </div>
      </div>

      {/* Master Detail 2-Column Outer Grid */}
      <div className="k-master-detail-grid">
        {/* Left Client Rail */}
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Clients ({implClients.length})
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {implClients.map(c => {
              const isSelected = c.id === activeClient?.id;
              const rLabel = implAutoRag(c);
              let totalPhases = 0;
              let completedPhases = 0;
              (c.modules || []).forEach(m => {
                totalPhases += (m.phases || []).length;
                completedPhases += (m.phases || []).filter(p => p.status === 'Completed').length;
              });

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-[#0e7490]/10 text-[#0e7490] font-semibold dark:bg-[#0e7490]/20'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs truncate font-medium">{c.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {completedPhases}/{totalPhases} phases completed
                    </div>
                  </div>

                  {rLabel && (
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        rLabel === 'Red'
                          ? 'bg-rose-500'
                          : rLabel === 'Amber'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    ></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Implementation Matrix */}
        <div className="space-y-5">
          {activeClient ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeClient.name} Matrix</h2>
                <p className="text-xs text-slate-500">{modules.length} implementation modules configured</p>
              </div>

              {modules.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No implementation modules configured for this client.
                </div>
              ) : (
                <div className="space-y-6">
                  {modules.map(m => (
                    <div key={m.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[#0e7490]" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.name}</h3>
                      </div>

                      {/* 9-Phase Grid */}
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {(m.phases || []).map((ph, idx) => {
                          const isOverdue = ph.targetDate && isOverdueDate(ph.targetDate) && ph.status !== 'Completed';

                          return (
                            <div
                              key={idx}
                              className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-800/40"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {ph.name}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    ph.status === 'Completed'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : ph.status === 'At Risk'
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                  }`}
                                >
                                  {ph.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3 text-slate-400" />
                                  <span>{ph.assignee || 'Unassigned'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  <span className={isOverdue ? 'text-rose-600 font-semibold' : ''}>
                                    {fmtDate(ph.targetDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400">Select a client from the rail.</div>
          )}
        </div>
      </div>
    </div>
  );
}
