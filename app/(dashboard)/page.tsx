'use client';

import React from 'react';
import useSWR from 'swr';
import { apiFetchClients } from '@/lib/api-client';
import { Client, Integration } from '@/types/client';
import {
  integRagLabel,
  implAutoRag,
  amsClientRag,
  overallRagLabel,
  isIntegrationStale,
  isIntegrationOverdue,
} from '@/lib/domain/rag';
import { calculateAssigneeCapacity } from '@/lib/domain/capacity';
import { fmtDate, daysDiff } from '@/lib/domain/date';
import {
  Users,
  AlertCircle,
  Clock,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR('clients', () =>
    apiFetchClients().then(res => res.clients)
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0e7490] border-t-transparent"></div>
          <span className="text-xs text-slate-400">Loading portfolio metrics…</span>
        </div>
      </div>
    );
  }

  const clients: Client[] = data || [];

  // 1. KPI Calculations
  const activeClients = clients.length;
  const allIntegrations: { client: Client; integ: Integration }[] = [];
  clients.forEach(c => {
    (c.integrations || []).forEach(i => allIntegrations.push({ client: c, integ: i }));
  });

  const totalIntegrations = allIntegrations.length;
  const inProgressIntegrations = allIntegrations.filter(x => x.integ.status === 'In Progress').length;
  const atRiskIntegrations = allIntegrations.filter(x => x.integ.status === 'At Risk').length;
  const completedIntegrations = allIntegrations.filter(x => x.integ.status === 'Completed').length;

  // 2. Client RAG Breakdown
  let redClients = 0;
  let amberClients = 0;
  let greenClients = 0;

  clients.forEach(c => {
    const iRag = integRagLabel(c);
    const mRag = c.modules !== undefined ? implAutoRag(c) : null;
    const aRag = c.workLog !== undefined ? amsClientRag(c) : null;
    const oRag = overallRagLabel(iRag, mRag, aRag);
    if (oRag === 'Red') redClients++;
    else if (oRag === 'Amber') amberClients++;
    else if (oRag === 'Green') greenClients++;
  });

  // 3. Critical Items (At Risk + Overdue)
  const criticalItems = allIntegrations
    .filter(x => x.integ.status === 'At Risk' || isIntegrationOverdue(x.integ))
    .slice(0, 8);

  // 4. Stale Integrations (>7d without update)
  const staleItems = allIntegrations
    .filter(x => isIntegrationStale(x.integ, 7) && !isIntegrationOverdue(x.integ))
    .slice(0, 5);

  // 5. Capacity summary
  const capacityList = calculateAssigneeCapacity(clients).slice(0, 6);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Portfolio Overview</h1>
          <p className="text-xs text-slate-500">Live delivery health across all active client accounts</p>
        </div>
        <button
          onClick={() => mutate()}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Clients</span>
            <Users className="h-4 w-4 text-[#0e7490]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{activeClients}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="text-rose-600 font-semibold">{redClients} Red</span> ·{' '}
            <span className="text-amber-600 font-semibold">{amberClients} Amber</span> ·{' '}
            <span className="text-emerald-600 font-semibold">{greenClients} Green</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{inProgressIntegrations}</div>
          <div className="mt-1 text-[11px] text-slate-500">of {totalIntegrations} total integrations</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">At Risk Items</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{atRiskIntegrations}</div>
          <div className="mt-1 text-[11px] text-rose-500 font-medium">Require immediate attention</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{completedIntegrations}</div>
          <div className="mt-1 text-[11px] text-slate-500">Delivered & signed off</div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8 Cols: Critical Items & Stale Updates */}
        <div className="space-y-6 lg:col-span-8">
          {/* Critical Items Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Critical & At-Risk Items</h2>
              </div>
              <span className="text-xs text-slate-400">{criticalItems.length} items</span>
            </div>

            {criticalItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No critical items detected across portfolio.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {criticalItems.map(({ client, integ }) => (
                  <div key={integ.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {integ.name}
                        </span>
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                          {integ.status}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{client.name}</span>
                        <span>·</span>
                        <span>Assignee: {integ.assignee || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-rose-600">{fmtDate(integ.dueDate)}</div>
                      <div className="text-[10px] text-slate-400">{daysDiff(integ.dueDate)}d overdue</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stale Updates (>7 days) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Stale Integrations (No update &gt;7d)</h2>
              </div>
              <span className="text-xs text-slate-400">{staleItems.length} items</span>
            </div>

            {staleItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">All active integrations have recent updates.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {staleItems.map(({ client, integ }) => (
                  <div key={integ.id} className="flex items-center justify-between py-2.5">
                    <div className="truncate">
                      <span className="text-xs font-medium text-slate-900 dark:text-white">{integ.name}</span>
                      <span className="text-xs text-slate-400 ml-2">({client.name})</span>
                    </div>
                    <span className="text-xs text-amber-600 font-medium shrink-0">Assignee: {integ.assignee}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Team Capacity Load */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#0e7490]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Team Load</h2>
              </div>
            </div>

            <div className="space-y-3.5">
              {capacityList.map(item => (
                <div key={item.assignee} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.assignee}</span>
                    <span className="text-slate-500 font-semibold">{item.inProgress} active</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[#0e7490]"
                      style={{ width: `${Math.min(100, item.inProgress * 20)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
