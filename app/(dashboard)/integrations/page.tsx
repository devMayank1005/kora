'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { apiFetchClients, apiSaveClients } from '@/lib/api-client';
import { Client, Integration, IntegrationStatus } from '@/types/client';
import { integRagLabel, isIntegrationOverdue, isIntegrationStale } from '@/lib/domain/rag';
import { fmtDate, daysDiff } from '@/lib/domain/date';
import { useUIStore } from '@/stores/uiStore';
import {
  Boxes,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Search,
  ChevronRight,
  Flame,
} from 'lucide-react';

const STATUS_OPTIONS: IntegrationStatus[] = [
  'Not Started',
  'In Progress',
  'At Risk',
  'Completed',
  'On Hold — Internal',
  'On Hold — Client',
];

export default function IntegrationsPage() {
  const { data, error, isLoading, mutate } = useSWR('clients', () =>
    apiFetchClients().then(res => res.clients)
  );
  const { showToast } = useUIStore();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedIntegId, setSelectedIntegId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState<string>('');

  // Pomodoro Focus Timer State (Section 30)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
      showToast('Focus session complete!', 'success');
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, showToast]);

  const clients: Client[] = data || [];

  // Filter clients by search
  const filteredClients = clients.filter(c =>
    clientSearch ? c.name.toLowerCase().includes(clientSearch.toLowerCase()) : true
  );

  const activeClient =
    filteredClients.find(c => c.id === selectedClientId) ||
    clients.find(c => c.id === selectedClientId) ||
    filteredClients[0] ||
    clients[0];

  const integrations = activeClient?.integrations || [];

  // Filter integrations
  const filteredIntegrations = integrations.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });

  const activeInteg =
    filteredIntegrations.find(i => i.id === selectedIntegId) ||
    filteredIntegrations[0] ||
    integrations[0];

  const handleStatusChange = async (newStatus: IntegrationStatus) => {
    if (!activeClient || !activeInteg) return;
    const updatedIntegrations = activeClient.integrations.map(i =>
      i.id === activeInteg.id ? { ...i, status: newStatus } : i
    );
    const updatedClient = { ...activeClient, integrations: updatedIntegrations };
    const updatedClients = clients.map(c => (c.id === activeClient.id ? updatedClient : c));

    try {
      mutate(updatedClients, false);
      await apiSaveClients(updatedClients, [activeClient.id], `Updated ${activeInteg.name} status to ${newStatus}`);
      showToast(`Status changed to ${newStatus}`, 'success');
      mutate();
    } catch (e: any) {
      showToast(e.message || 'Failed to update status', 'error');
      mutate();
    }
  };

  const timerMin = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const timerSec = String(timerSeconds % 60).padStart(2, '0');

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0e7490] border-t-transparent"></div>
          <span className="text-xs text-slate-400">Loading integrations hub…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Integrations</h1>
          <p className="text-xs text-slate-500">Client connectors, milestone tracking & delivery execution</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Compact Focus Timer Widget (Section 30) */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-mono dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {timerMin}:{timerSec}
            </span>
            <button
              onClick={() => setTimerActive(!timerActive)}
              className="p-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              title={timerActive ? 'Pause' : 'Start'}
            >
              {timerActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <button
              onClick={() => {
                setTimerActive(false);
                setTimerSeconds(25 * 60);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title="Reset"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Master Detail 2-Column Outer Grid */}
      <div className="k-master-detail-grid">
        {/* Left Client Rail (260px) */}
        <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Search clients…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 focus:border-[#0e7490] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {filteredClients.map(c => {
              const isSelected = c.id === activeClient?.id;
              const rLabel = integRagLabel(c);
              const total = c.integrations?.length || 0;
              const completed = (c.integrations || []).filter(i => i.status === 'Completed').length;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedClientId(c.id);
                    setSelectedIntegId(null);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all ${
                    isSelected
                      ? 'bg-[#0e7490]/10 text-[#0e7490] font-semibold dark:bg-[#0e7490]/20'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs truncate font-medium">{c.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {completed}/{total} ({pct}%)
                    </div>
                  </div>

                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      rLabel === 'Red' ? 'bg-rose-500' : rLabel === 'Amber' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  ></span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 12-Column Detail Panel */}
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['all', ...STATUS_OPTIONS].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-[#0e7490] text-white font-semibold shadow-2xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {st === 'all'
                  ? `All (${integrations.length})`
                  : `${st} (${integrations.filter(i => i.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Inner 12-Column Grid (4:8 List/Detail Split) */}
          <div className="grid grid-cols-12 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 min-h-[480px]">
            {/* 4-Col Sub-list */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 border-r border-slate-100 overflow-y-auto max-h-[640px] dark:border-slate-800">
              <div className="sticky top-0 border-b border-slate-100 bg-slate-50/90 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider backdrop-blur-xs dark:border-slate-800 dark:bg-slate-800/90">
                {filteredIntegrations.length} Item{filteredIntegrations.length !== 1 ? 's' : ''}
              </div>

              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredIntegrations.map(i => {
                  const isActive = i.id === activeInteg?.id;
                  const isOverdue = isIntegrationOverdue(i);

                  return (
                    <div
                      key={i.id}
                      onClick={() => setSelectedIntegId(i.id)}
                      className={`cursor-pointer px-3.5 py-3 transition-colors ${
                        isActive
                          ? 'border-l-2 border-l-[#0e7490] bg-[#0e7490]/5 dark:bg-[#0e7490]/15'
                          : 'border-l-2 border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {i.name}
                        </span>
                        <span className={`text-[10px] font-mono shrink-0 ${isOverdue ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>
                          {fmtDate(i.dueDate)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">{i.description || '—'}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            i.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : i.status === 'At Risk'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                          }`}
                        >
                          {i.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 8-Col Detail Panel */}
            <div className="col-span-12 md:col-span-7 lg:col-span-8 p-6 flex flex-col justify-between overflow-y-auto max-h-[640px]">
              {activeInteg ? (
                <div className="space-y-6">
                  {/* Top Toolbar */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeInteg.name}</h2>
                        <span className="text-xs text-slate-400 font-medium">({activeClient.name})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{activeInteg.description || 'No description recorded'}</p>
                    </div>

                    <select
                      value={activeInteg.status}
                      onChange={e => handleStatusChange(e.target.value as IntegrationStatus)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:ring-2 focus:ring-[#0e7490] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {STATUS_OPTIONS.map(st => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3-Column Attribute Tiles */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignee</span>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                        <User className="h-3.5 w-3.5 text-[#0e7490]" />
                        <span>{activeInteg.assignee || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Due Date</span>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                        <Calendar className="h-3.5 w-3.5 text-[#0e7490]" />
                        <span className={isIntegrationOverdue(activeInteg) ? 'text-rose-600' : ''}>
                          {fmtDate(activeInteg.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effort Weight</span>
                      <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                        {activeInteg.effort || 'Medium (2)'}
                      </div>
                    </div>
                  </div>

                  {/* Activity & Timeline Updates */}
                  <div className="space-y-2.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recent Timeline Updates</h3>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                      {(activeInteg.timeline || []).length === 0 ? (
                        <div className="text-xs text-slate-400">No activity notes recorded yet.</div>
                      ) : (
                        <div className="space-y-2.5">
                          {(activeInteg.timeline || []).slice(0, 4).map((upd, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs">
                              <span className="font-mono text-[11px] text-slate-400 shrink-0">{fmtDate(upd.date)}</span>
                              <span className="text-slate-700 dark:text-slate-300">{upd.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-xs text-slate-400">Select an integration from the list.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
