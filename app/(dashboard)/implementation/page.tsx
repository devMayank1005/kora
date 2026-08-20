'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiFetchClients } from '@/lib/api-client';
import { Client, ImplementationModule, Phase } from '@/types/client';
import { implAutoRag } from '@/lib/domain/rag';
import { fmtDate, isOverdueDate } from '@/lib/domain/date';
import {
  KanbanSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Layers,
  Search,
  ChevronRight,
} from 'lucide-react';

export default function ImplementationMatrixPage() {
  const { data, error, isLoading } = useSWR('clients', () =>
    apiFetchClients().then(res => res.clients)
  );

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  const clients: Client[] = data || [];
  const implClients = clients.filter(c => (c.modules || []).length > 0);

  const filteredImplClients = implClients.filter(c =>
    clientSearch ? c.name.toLowerCase().includes(clientSearch.toLowerCase()) : true
  );

  const activeClient =
    filteredImplClients.find(c => c.id === selectedClientId) ||
    implClients.find(c => c.id === selectedClientId) ||
    filteredImplClients[0] ||
    implClients[0];

  const modules = activeClient?.modules || [];

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0891b2] border-t-transparent"></div>
          <span className="text-xs font-medium text-slate-400">Loading implementation matrices…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Implementation Matrices
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            9-phase deployment gates, sign-off status & milestone tracking
          </p>
        </div>
      </div>

      {/* Master Detail 2-Column Outer Grid */}
      <div className="k-master-detail-grid">
        {/* Left Client Rail (260px) */}
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Search accounts…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:border-[#0891b2] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-260px)]">
            {filteredImplClients.map(c => {
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
                      ? 'bg-gradient-to-r from-[#0891b2]/15 to-[#0891b2]/5 text-[#0891b2] font-bold border-l-3 border-[#0891b2] dark:from-[#0891b2]/25'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs truncate font-bold">{c.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {completedPhases}/{totalPhases} phases completed
                    </div>
                  </div>

                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      rLabel === 'Red' ? 'bg-rose-500' : rLabel === 'Amber' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  ></span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Matrix View */}
        <div className="space-y-5">
          {activeClient ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeClient.name}</h2>
                  <span className="text-xs text-slate-400 font-mono">({modules.length} modules configured)</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Multi-phase deployment gates and sign-offs</p>
              </div>

              {modules.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No implementation modules recorded for this client.
                </div>
              ) : (
                <div className="space-y-6">
                  {modules.map(m => (
                    <div key={m.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[#0891b2]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {m.name}
                        </h3>
                      </div>

                      {/* 9-Phase Responsive Matrix */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {(m.phases || []).map((ph, idx) => {
                          const isOverdue = ph.targetDate && isOverdueDate(ph.targetDate) && ph.status !== 'Completed';

                          return (
                            <div
                              key={idx}
                              className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {ph.name}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    ph.status === 'Completed'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : ph.status === 'At Risk'
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                  }`}
                                >
                                  {ph.status === 'Completed' && <CheckCircle2 className="h-3 w-3" />}
                                  {ph.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{ph.assignee || 'Unassigned'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
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
