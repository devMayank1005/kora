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
  Play,
  Pause,
  RotateCcw,
  Search,
  ChevronRight,
  Flame,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';

const STATUS_OPTIONS: IntegrationStatus[] = [
  'Not Started',
  'In Progress',
  'At Risk',
  'Completed',
  'On Hold — Internal',
  'On Hold — Client',
];

export default function IntegrationsHubPage() {
  const { data, error, isLoading, mutate } = useSWR('clients', () =>
    apiFetchClients().then(res => res.clients)
  );
  const { showToast } = useUIStore();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedIntegId, setSelectedIntegId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState<string>('');

  // Pomodoro Focus Timer State
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
      <div className="flex h-80 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0891b2] border-t-transparent"></div>
          <span className="text-xs font-medium text-slate-400">Loading integrations hub…</span>
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
            Integrations Workspace
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            System connectors, milestone deliverables & timeline logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Focus Timer Widget */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-mono dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
            <Flame className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-slate-900 dark:text-white">
              {timerMin}:{timerSec}
            </span>
            <button
              onClick={() => setTimerActive(!timerActive)}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={timerActive ? 'Pause' : 'Start'}
            >
              {timerActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => {
                setTimerActive(false);
                setTimerSeconds(25 * 60);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
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
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#0891b2]/15 to-[#0891b2]/5 text-[#0891b2] font-bold border-l-3 border-[#0891b2] dark:from-[#0891b2]/25'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs truncate font-bold">{c.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {completed}/{total} completed ({pct}%)
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

        {/* Right 12-Column Detail Panel */}
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {['all', ...STATUS_OPTIONS].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-[#0891b2] text-white shadow-sm shadow-cyan-500/20'
                    : 'border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {st === 'all'
                  ? `All (${integrations.length})`
                  : `${st} (${integrations.filter(i => i.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Inner 12-Column Grid (4:8 Split) */}
          <div className="grid grid-cols-12 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 min-h-[500px]">
            {/* 4-Col Sub-list */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 border-r border-slate-100 overflow-y-auto max-h-[660px] dark:border-slate-800">
              <div className="sticky top-0 border-b border-slate-100 bg-slate-50/90 px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider backdrop-blur-xs dark:border-slate-800 dark:bg-slate-800/90">
                {filteredIntegrations.length} Connector{filteredIntegrations.length !== 1 ? 's' : ''}
              </div>

              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredIntegrations.map(i => {
                  const isActive = i.id === activeInteg?.id;
                  const isOverdue = isIntegrationOverdue(i);

                  return (
                    <div
                      key={i.id}
                      onClick={() => setSelectedIntegId(i.id)}
                      className={`cursor-pointer px-4 py-3.5 transition-all ${
                        isActive
                          ? 'border-l-3 border-l-[#0891b2] bg-cyan-50/30 dark:bg-cyan-950/20'
                          : 'border-l-3 border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {i.name}
                        </span>
                        <span className={`text-[10px] font-mono shrink-0 ${isOverdue ? 'font-bold text-rose-600' : 'text-slate-400'}`}>
                          {fmtDate(i.dueDate)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 truncate">{i.description || '—'}</p>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
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
            <div className="col-span-12 md:col-span-7 lg:col-span-8 p-6 flex flex-col justify-between overflow-y-auto max-h-[660px]">
              {activeInteg ? (
                <div className="space-y-6">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeInteg.name}</h2>
                        <span className="text-xs font-medium text-slate-400">({activeClient.name})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{activeInteg.description || 'No description recorded'}</p>
                    </div>

                    <select
                      value={activeInteg.status}
                      onChange={e => handleStatusChange(e.target.value as IntegrationStatus)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-[#0891b2] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {STATUS_OPTIONS.map(st => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3-Column Attribute Tiles */}
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Assignee</span>
                      <div className="mt-1.5 flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <User className="h-4 w-4 text-[#0891b2]" />
                        <span>{activeInteg.assignee || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date</span>
                      <div className="mt-1.5 flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <Calendar className="h-4 w-4 text-[#0891b2]" />
                        <span className={isIntegrationOverdue(activeInteg) ? 'text-rose-600' : ''}>
                          {fmtDate(activeInteg.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complexity Score</span>
                      <div className="mt-1.5 text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {activeInteg.effort || 'Medium'}
                      </div>
                    </div>
                  </div>

                  {/* Activity Updates */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Timeline Updates</h3>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                      {(activeInteg.timeline || []).length === 0 ? (
                        <div className="text-xs text-slate-400">No activity notes recorded yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {(activeInteg.timeline || []).slice(0, 4).map((upd, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-xs">
                              <span className="font-mono text-[11px] font-semibold text-slate-400 shrink-0">
                                {fmtDate(upd.date)}
                              </span>
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
