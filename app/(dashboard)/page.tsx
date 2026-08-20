'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
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
  RefreshCw,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Briefcase,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function CockpitDashboardPage() {
  const { data, error, isLoading, mutate, isValidating } = useSWR('clients', () =>
    apiFetchClients().then(res => res.clients)
  );

  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [portfolioHealthFilter, setPortfolioHealthFilter] = useState<'all' | 'Red' | 'Amber' | 'Green'>('all');

  const clients: Client[] = data || [];

  // Flatten integrations
  const allIntegrations: { client: Client; integ: Integration }[] = [];
  clients.forEach(c => {
    (c.integrations || []).forEach(i => allIntegrations.push({ client: c, integ: i }));
  });

  // 1. KPI Metrics
  const activeClientsCount = clients.length;
  const totalIntegrationsCount = allIntegrations.length;
  const inProgressIntegrationsCount = allIntegrations.filter(x => x.integ.status === 'In Progress').length;
  const atRiskIntegrationsCount = allIntegrations.filter(x => x.integ.status === 'At Risk' || isIntegrationOverdue(x.integ)).length;
  const criticalCount = allIntegrations.filter(x => isIntegrationOverdue(x.integ) && x.integ.status === 'At Risk').length;

  // 2. Health Breakdown
  let healthyClients = 0;
  let atRiskClients = 0;
  let criticalClients = 0;

  clients.forEach(c => {
    const oRag = overallRagLabel(integRagLabel(c), c.modules ? implAutoRag(c) : null, c.workLog ? amsClientRag(c) : null);
    if (oRag === 'Red') criticalClients++;
    else if (oRag === 'Amber') atRiskClients++;
    else healthyClients++;
  });

  const totalClientsForHealth = Math.max(1, activeClientsCount);
  const healthyPct = Math.round((healthyClients / totalClientsForHealth) * 100);
  const atRiskPct = Math.round((atRiskClients / totalClientsForHealth) * 100);
  const criticalPct = 100 - healthyPct - atRiskPct;

  // 3. Attention Required List
  const attentionItems: {
    severity: 'Critical' | 'High' | 'Medium';
    item: string;
    client: string;
    owner: string;
    age: string;
    type: 'integ' | 'phase' | 'ticket';
  }[] = [];

  allIntegrations.forEach(({ client, integ }) => {
    const overdue = isIntegrationOverdue(integ);
    const stale = isIntegrationStale(integ, 7);
    if (integ.status === 'At Risk' && overdue) {
      attentionItems.push({
        severity: 'Critical',
        item: `${integ.name} — Overdue & At Risk`,
        client: client.name,
        owner: integ.assignee || 'Unassigned',
        age: `${daysDiff(integ.dueDate)}d`,
        type: 'integ',
      });
    } else if (integ.status === 'At Risk') {
      attentionItems.push({
        severity: 'High',
        item: `${integ.name} — Execution Blocked`,
        client: client.name,
        owner: integ.assignee || 'Unassigned',
        age: '2d',
        type: 'integ',
      });
    } else if (stale && !overdue) {
      attentionItems.push({
        severity: 'Medium',
        item: `${integ.name} — No update >7d`,
        client: client.name,
        owner: integ.assignee || 'Unassigned',
        age: '7d+',
        type: 'integ',
      });
    }
  });

  // 4. Upcoming Milestones
  const upcomingMilestones: {
    dateLabel: string;
    milestone: string;
    client: string;
    owner: string;
  }[] = [];

  allIntegrations
    .filter(x => x.integ.dueDate && !isIntegrationOverdue(x.integ) && x.integ.status !== 'Completed')
    .sort((a, b) => (a.integ.dueDate > b.integ.dueDate ? 1 : -1))
    .slice(0, 5)
    .forEach(({ client, integ }) => {
      const diff = daysDiff(integ.dueDate);
      const dateLabel = diff === 0 ? 'Today' : diff === -1 ? 'Tomorrow' : fmtDate(integ.dueDate);
      upcomingMilestones.push({
        dateLabel,
        milestone: integ.name,
        client: client.name,
        owner: integ.assignee || 'Unassigned',
      });
    });

  // 5. Team Capacity Bars
  const capacityList = calculateAssigneeCapacity(clients).slice(0, 5);

  // 6. Client Portfolio Table Filtering
  const filteredPortfolioClients = clients.filter(c => {
    if (portfolioSearch && !c.name.toLowerCase().includes(portfolioSearch.toLowerCase())) return false;
    const oRag = overallRagLabel(integRagLabel(c), c.modules ? implAutoRag(c) : null, c.workLog ? amsClientRag(c) : null);
    if (portfolioHealthFilter !== 'all' && oRag !== portfolioHealthFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0e7490] border-t-transparent"></div>
          <span className="text-xs text-slate-400">Loading delivery command center…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-xs text-slate-500">Operational overview across clients and delivery</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-mono">
            {isValidating ? 'Syncing live data…' : 'Live data synced'}
          </span>
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Structured KPI Metric Strip */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Clients</span>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{activeClientsCount}</div>
          <p className="mt-1 text-[11px] text-slate-500">Across 3 delivery tracks</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Integrations</span>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{totalIntegrationsCount}</div>
          <p className="mt-1 text-[11px] text-blue-600 font-medium">{inProgressIntegrationsCount} currently in progress</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">At Risk</span>
          <div className="mt-1.5 text-2xl font-bold text-rose-600">{atRiskIntegrationsCount}</div>
          <p className="mt-1 text-[11px] text-rose-500 font-medium">{criticalCount} critical overdue</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Team Capacity</span>
          <div className="mt-1.5 text-2xl font-bold text-[#0e7490]">78%</div>
          <p className="mt-1 text-[11px] text-slate-500">Optimal throughput</p>
        </div>
      </div>

      {/* 3. Main 12-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Attention Required + Upcoming Milestones */}
        <div className="space-y-6 lg:col-span-8">
          {/* Attention Required Card */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Attention Required
                </h2>
              </div>
              <Link
                href="/integrations"
                className="text-xs font-medium text-[#0e7490] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {attentionItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All client deliverables and milestones are on track.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs mt-2">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-2 font-medium">Severity</th>
                      <th className="pb-2 font-medium">Item</th>
                      <th className="pb-2 font-medium">Client</th>
                      <th className="pb-2 font-medium">Owner</th>
                      <th className="pb-2 text-right font-medium">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {attentionItems.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              row.severity === 'Critical'
                                ? 'text-rose-600'
                                : row.severity === 'High'
                                ? 'text-amber-600'
                                : 'text-blue-600'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.severity === 'Critical'
                                  ? 'bg-rose-500'
                                  : row.severity === 'High'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                            ></span>
                            {row.severity}
                          </span>
                        </td>
                        <td className="py-2.5 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                          {row.item}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">{row.client}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">{row.owner}</td>
                        <td className="py-2.5 text-right font-mono text-[11px] text-slate-400">{row.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upcoming Milestones Card */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#0e7490]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Upcoming Milestones
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Next 14 days</span>
            </div>

            {upcomingMilestones.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No milestone deadlines within the next 14 days.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs mt-2">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-2 font-medium">When</th>
                      <th className="pb-2 font-medium">Milestone</th>
                      <th className="pb-2 font-medium">Client</th>
                      <th className="pb-2 text-right font-medium">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {upcomingMilestones.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 font-semibold text-[#0e7490]">{m.dateLabel}</td>
                        <td className="py-2.5 font-medium text-slate-900 dark:text-white truncate max-w-[220px]">
                          {m.milestone}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">{m.client}</td>
                        <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{m.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Delivery Health + Team Capacity */}
        <div className="space-y-6 lg:col-span-4">
          {/* Delivery Health Panel */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-3 dark:border-slate-800">
              Delivery Health
            </h2>

            {/* Segmented Distribution Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${healthyPct}%` }}
                  title={`${healthyClients} Healthy (${healthyPct}%)`}
                ></div>
                <div
                  className="bg-amber-500 transition-all duration-300"
                  style={{ width: `${atRiskPct}%` }}
                  title={`${atRiskClients} At Risk (${atRiskPct}%)`}
                ></div>
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{ width: `${criticalPct}%` }}
                  title={`${criticalClients} Critical (${criticalPct}%)`}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 dark:text-slate-400">{healthyClients} Healthy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-600 dark:text-slate-400">{atRiskClients} At Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  <span className="text-slate-600 dark:text-slate-400">{criticalClients} Critical</span>
                </div>
              </div>
            </div>

            {/* Client mini-list */}
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-2 dark:divide-slate-800 dark:border-slate-800">
              {clients.slice(0, 4).map(c => {
                const oRag = overallRagLabel(integRagLabel(c), c.modules ? implAutoRag(c) : null, c.workLog ? amsClientRag(c) : null);
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        oRag === 'Red'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : oRag === 'Amber'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}
                    >
                      {oRag || 'Green'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Capacity Workload Horizontal Comparison */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-3 dark:border-slate-800">
              Team Capacity
            </h2>

            <div className="mt-4 space-y-3">
              {capacityList.map(item => {
                const loadPct = Math.min(100, item.inProgress * 22 + 20);
                const loadLabel = loadPct >= 85 ? 'High' : loadPct >= 60 ? 'Normal' : 'Available';
                const loadColor =
                  loadPct >= 85 ? 'bg-rose-500' : loadPct >= 60 ? 'bg-[#0e7490]' : 'bg-emerald-500';

                return (
                  <div key={item.assignee} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.assignee}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {loadPct}% · <strong className="font-semibold text-slate-700 dark:text-slate-300">{loadLabel}</strong>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full ${loadColor}`} style={{ width: `${loadPct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Client Portfolio Operational Table (12 cols) */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Client Portfolio
            </h2>
            <p className="text-[11px] text-slate-500">Active accounts and delivery progress</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={portfolioSearch}
                onChange={e => setPortfolioSearch(e.target.value)}
                placeholder="Search clients…"
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-[#0e7490] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={portfolioHealthFilter}
              onChange={e => setPortfolioHealthFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">All Health States</option>
              <option value="Green">Healthy Only</option>
              <option value="Amber">At Risk Only</option>
              <option value="Red">Critical Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="pb-2.5">Client</th>
                <th className="pb-2.5">Health</th>
                <th className="pb-2.5">Integrations</th>
                <th className="pb-2.5">Delivery Progress</th>
                <th className="pb-2.5">Lead</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {filteredPortfolioClients.map(c => {
                const oRag = overallRagLabel(integRagLabel(c), c.modules ? implAutoRag(c) : null, c.workLog ? amsClientRag(c) : null);
                const total = c.integrations?.length || 0;
                const completed = (c.integrations || []).filter(i => i.status === 'Completed').length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      <Link href="/integrations" className="hover:text-[#0e7490]">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          oRag === 'Red'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            : oRag === 'Amber'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        {oRag || 'Green'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {completed} / {total}
                    </td>
                    <td className="py-3 max-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-[#0e7490]" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{c.masterAssignee || 'Team Kognoz'}</td>
                    <td className="py-3 text-right">
                      <Link
                        href="/integrations"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0e7490] hover:underline"
                      >
                        <span>Open Hub</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
