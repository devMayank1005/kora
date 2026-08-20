'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiFetchClients } from '@/lib/api-client';
import { Client, WorkLogEntry } from '@/types/client';
import { amsClientRag } from '@/lib/domain/rag';
import { calculateAmsTotals } from '@/lib/domain/billing';
import { fmtDate, isOverdueDate } from '@/lib/domain/date';
import { useUIStore } from '@/stores/uiStore';
import {
  Headphones,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  Plus,
} from 'lucide-react';

export default function AmsPage() {
  const { data, error, isLoading } = useSWR('clients', () =>
    apiFetchClients().then(res => res.clients)
  );
  const { showToast } = useUIStore();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const clients: Client[] = data || [];
  const amsClients = clients.filter(c => c.workLog !== undefined);
  const activeClient = amsClients.find(c => c.id === selectedClientId) || amsClients[0] || clients[0];

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const monthName = selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const prevMonth = () => setSelectedMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setSelectedMonth(new Date(year, month + 1, 1));
  const setThisMonth = () => setSelectedMonth(new Date());

  const billing = activeClient ? calculateAmsTotals(activeClient, monthStart, monthEnd) : null;
  const entries = activeClient?.workLog || [];

  const filteredEntries = entries.filter(e => {
    const d = e.dateRaised || '';
    return d >= monthStart && d <= monthEnd;
  });

  const activeEntry =
    filteredEntries.find(e => e.id === selectedEntryId) ||
    filteredEntries[0] ||
    entries[0];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0e7490] border-t-transparent"></div>
          <span className="text-xs text-slate-400">Loading AMS tickets…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">AMS & Support Hub</h1>
          <p className="text-xs text-slate-500">Managed services, monthly retainer hours & ticket governance</p>
        </div>
      </div>

      {/* Month Stepper Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="px-3 text-xs font-bold text-slate-900 dark:text-white min-w-[140px] text-center">
            {monthName}
          </span>

          <button
            onClick={nextMonth}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={setThisMonth}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            This Month
          </button>
        </div>
      </div>

      {/* Master Detail 2-Column Outer Grid */}
      <div className="k-master-detail-grid">
        {/* Left Client Rail */}
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Clients ({amsClients.length})
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {amsClients.map(c => {
              const isSelected = c.id === activeClient?.id;
              const rLabel = amsClientRag(c);
              const openTickets = (c.workLog || []).filter(e => e.entryStatus !== 'Closed').length;

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedClientId(c.id);
                    setSelectedEntryId(null);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-[#0e7490]/10 text-[#0e7490] font-semibold dark:bg-[#0e7490]/20'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs truncate font-medium">{c.name}</div>
                    <div className="text-[10px] text-slate-400">{openTickets} open tickets</div>
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

        {/* Right Detail Panel */}
        <div className="space-y-5">
          {/* Billing Summary Cards */}
          {billing && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Hours Logged</span>
                <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">
                  {billing.totalHours.toFixed(1)} hrs
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Retainer Pool</span>
                <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">
                  {billing.hasBucket ? `${billing.bucketHours} hrs` : 'No Retainer'}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billable Days</span>
                <div className="mt-1.5 text-xl font-bold text-[#0e7490]">
                  {billing.billableDays.toFixed(2)} days
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated Amount</span>
                <div className="mt-1.5 text-xl font-bold text-emerald-600">
                  ₹{Math.round(billing.amount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}

          {/* Ticket Master Detail 12-Column Grid */}
          <div className="grid grid-cols-12 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 min-h-[480px]">
            {/* 4-Col List */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 border-r border-slate-100 overflow-y-auto max-h-[640px] dark:border-slate-800">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide backdrop-blur-xs dark:border-slate-800 dark:bg-slate-800/80">
                <span>{filteredEntries.length} Ticket{filteredEntries.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredEntries.map(e => {
                  const isActive = e.id === activeEntry?.id;
                  const isOverdue = isOverdueDate(e.dueDate);

                  return (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEntryId(e.id)}
                      className={`cursor-pointer px-3.5 py-3 transition-colors ${
                        isActive
                          ? 'border-l-2 border-l-[#0e7490] bg-[#0e7490]/5 dark:bg-[#0e7490]/15'
                          : 'border-l-2 border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {e.module || e.project || 'General Support'}
                        </span>
                        <span className={`text-[10px] shrink-0 ${isOverdue ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>
                          {fmtDate(e.dateRaised)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">{e.description || '—'}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {e.hours}h
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                          {e.entryStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 8-Col Detail View */}
            <div className="col-span-12 md:col-span-7 lg:col-span-8 p-6 flex flex-col justify-between overflow-y-auto max-h-[640px]">
              {activeEntry ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {activeEntry.module || activeEntry.project || 'General Support'}
                      </h2>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        {activeEntry.entryStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{activeEntry.description}</p>
                  </div>

                  {/* 4-Column Attribute Tiles */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date Raised</div>
                      <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                        {fmtDate(activeEntry.dateRaised)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Raised By</div>
                      <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                        {activeEntry.raisedBy || '—'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Query Level</div>
                      <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                        {activeEntry.queryLevel}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hours Logged</div>
                      <div className="mt-1 text-xs font-bold text-[#0e7490]">
                        {activeEntry.hours} hrs
                      </div>
                    </div>
                  </div>

                  {/* Solution & Discussion Notes Callout */}
                  <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0e7490]">
                      💡 Solution & Resolution Notes
                    </h3>
                    <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                      {activeEntry.solutionDiscussed || 'No solution or resolution notes recorded yet.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-xs text-slate-400">Select a ticket to view details.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
