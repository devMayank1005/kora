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
  AlertTriangle,
  Clock,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Flame,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { data, error, isLoading, mutate, isValidating } = useSWR('clients', () =>
    apiFetchClients().then(res => res.clients)
  );

  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [portfolioHealthFilter, setPortfolioHealthFilter] = useState<'all' | 'Red' | 'Amber' | 'Green'>('all');

  const clients: Client[] = data || [];

  // Flatten all integrations
  const allIntegrations: { client: Client; integ: Integration }[] = [];
  clients.forEach(c => {
    (c.integrations || []).forEach(i => allIntegrations.push({ client: c, integ: i }));
  });

  // KPI Metrics
  const activeClientsCount = clients.length;
  const totalIntegrationsCount = allIntegrations.length;
  const inProgressIntegrationsCount = allIntegrations.filter(x => x.integ.status === 'In Progress').length;
  const atRiskIntegrationsCount = allIntegrations.filter(
    x => x.integ.status === 'At Risk' || isIntegrationOverdue(x.integ)
  ).length;

  // Portfolio Health Breakdown
  let healthyClients = 0;
  let atRiskClients = 0;
  let criticalClients = 0;

  clients.forEach(c => {
    const oRag = overallRagLabel(
      integRagLabel(c),
      c.modules ? implAutoRag(c) : null,
      c.workLog ? amsClientRag(c) : null
    );
    if (oRag === 'Red') criticalClients++;
    else if (oRag === 'Amber') atRiskClients++;
    else healthyClients++;
  });

  const totalClientsForHealth = Math.max(1, activeClientsCount);
  const healthyPct = Math.round((healthyClients / totalClientsForHealth) * 100);
  const atRiskPct = Math.round((atRiskClients / totalClientsForHealth) * 100);
  const criticalPct = 100 - healthyPct - atRiskPct;

  // Attention Required Items
  const attentionItems: {
    severity: 'Critical' | 'High' | 'Medium';
    item: string;
    client: string;
    owner: string;
    age: string;
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
      });
    } else if (integ.status === 'At Risk') {
      attentionItems.push({
        severity: 'High',
        item: `${integ.name} — Blocked`,
        client: client.name,
        owner: integ.assignee || 'Unassigned',
        age: '2d',
      });
    } else if (stale && !overdue) {
      attentionItems.push({
        severity: 'Medium',
        item: `${integ.name} — Stale (>7d)`,
        client: client.name,
        owner: integ.assignee || 'Unassigned',
        age: '7d+',
      });
    }
  });

  // Upcoming Milestones
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

  // Team Capacity
  const capacityList = calculateAssigneeCapacity(clients).slice(0, 5);

  // Filtered Client Portfolio
  const filteredPortfolioClients = clients.filter(c => {
    if (portfolioSearch && !c.name.toLowerCase().includes(portfolioSearch.toLowerCase())) return false;
    const oRag = overallRagLabel(
      integRagLabel(c),
      c.modules ? implAutoRag(c) : null,
      c.workLog ? amsClientRag(c) : null
    );
    if (portfolioHealthFilter !== 'all' && oRag !== portfolioHealthFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0891b2] border-t-transparent"></div>
          <span className="text-xs font-medium text-slate-400">Loading delivery command center…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* 1. Executive Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Operations Cockpit
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400">
              <Sparkles className="h-3 w-3" /> Live
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real-time delivery oversight across integrations, implementations & AMS retainers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin text-cyan-600' : 'text-slate-400'}`} />
            <span>{isValidating ? 'Syncing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Brand New Metric Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</span>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{activeClientsCount}</div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span>3 active tracks</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Connectors</span>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{totalIntegrationsCount}</div>
          <div className="mt-2 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            {inProgressIntegrationsCount} in active rollout
          </div>
        </div>

        {/* Metric 3 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500"></div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">At Risk Items</span>
          <div className="mt-2 text-3xl font-extrabold text-rose-600">{atRiskIntegrationsCount}</div>
          <div className="mt-2 text-[11px] font-medium text-rose-500">Immediate attention needed</div>
        </div>

        {/* Metric 4 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Team Throughput</span>
          <div className="mt-2 text-3xl font-extrabold text-[#0891b2]">78%</div>
          <div className="mt-2 text-[11px] font-medium text-slate-500">Optimal velocity score</div>
        </div>
      </div>

      {/* 3. Main 12-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8-Column Panel */}
        <div className="space-y-6 lg:col-span-8">
          {/* Attention Required Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Priority Action Required
                </h2>
              </div>
              <Link
                href="/integrations"
                className="text-xs font-semibold text-[#0891b2] hover:text-cyan-600 flex items-center gap-1 transition-colors"
              >
                <span>View all items</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {attentionItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                ✨ Zero blockers — all client deliverables are progressing smoothly.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs mt-3">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-2.5">Severity</th>
                      <th className="pb-2.5">Deliverable</th>
                      <th className="pb-2.5">Account</th>
                      <th className="pb-2.5">Assignee</th>
                      <th className="pb-2.5 text-right">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {attentionItems.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              row.severity === 'Critical'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                : row.severity === 'High'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
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
                        <td className="py-3 font-semibold text-slate-900 dark:text-white max-w-[220px] truncate">
                          {row.item}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-400">{row.client}</td>
                        <td className="py-3 text-slate-600 dark:text-slate-400">{row.owner}</td>
                        <td className="py-3 text-right font-mono text-[11px] text-slate-400">{row.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

            {/* Upcoming Milestones Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#0891b2]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Upcoming Milestones
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Next 14 Days</span>
            </div>

            {upcomingMilestones.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">No milestones scheduled for the next 14 days.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs mt-3">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-2.5">Target</th>
                      <th className="pb-2.5">Milestone</th>
                      <th className="pb-2.5">Account</th>
                      <th className="pb-2.5 text-right">Lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {upcomingMilestones.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-bold text-[#0891b2]">{m.dateLabel}</td>
                        <td className="py-3 font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                          {m.milestone}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-400">{m.client}</td>
                        <td className="py-3 text-right text-slate-600 dark:text-slate-400">{m.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 4-Column Panel */}
        <div className="space-y-6 lg:col-span-4">
          {/* Delivery Health Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              Delivery Health Matrix
            </h2>

            {/* Segmented Distribution Bar */}
            <div className="mt-5 space-y-3">
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${healthyPct}%` }}
                  title={`${healthyClients} Healthy (${healthyPct}%)`}
                ></div>
                <div
                  className="bg-amber-500 transition-all duration-500"
                  style={{ width: `${atRiskPct}%` }}
                  title={`${atRiskClients} At Risk (${atRiskPct}%)`}
                ></div>
                <div
                  className="bg-rose-500 transition-all duration-500"
                  style={{ width: `${criticalPct}%` }}
                  title={`${criticalClients} Critical (${criticalPct}%)`}
                ></div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="rounded-xl bg-emerald-50/60 p-2 dark:bg-emerald-950/20">
                  <div className="text-base font-extrabold text-emerald-600">{healthyClients}</div>
                  <div className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Healthy</div>
                </div>
                <div className="rounded-xl bg-amber-50/60 p-2 dark:bg-amber-950/20">
                  <div className="text-base font-extrabold text-amber-600">{atRiskClients}</div>
                  <div className="text-[10px] font-medium text-amber-700 dark:text-amber-400">At Risk</div>
                </div>
                <div className="rounded-xl bg-rose-50/60 p-2 dark:bg-rose-950/20">
                  <div className="text-base font-extrabold text-rose-600">{criticalClients}</div>
                  <div className="text-[10px] font-medium text-rose-700 dark:text-rose-400">Critical</div>
                </div>
              </div>
            </div>

            {/* Client Health Mini List */}
            <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100 pt-2 dark:divide-slate-800 dark:border-slate-800">
              {clients.slice(0, 4).map(c => {
                const oRag = overallRagLabel(
                  integRagLabel(c),
                  c.modules ? implAutoRag(c) : null,
                  c.workLog ? amsClientRag(c) : null
                );
                return (
                  <div key={c.id} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
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

          {/* Team Capacity Load Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              Team Workload & Capacity
            </h2>

            <div className="mt-5 space-y-3.5">
              {capacityList.map(item => {
                const loadPct = Math.min(100, item.inProgress * 22 + 20);
                const loadLabel = loadPct >= 85 ? 'Overloaded' : loadPct >= 60 ? 'Optimal' : 'Available';
                const loadColor =
                  loadPct >= 85 ? 'bg-rose-500' : loadPct >= 60 ? 'bg-[#0891b2]' : 'bg-emerald-500';

                return (
                  <div key={item.assignee} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.assignee}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {loadPct}% · <strong className="font-semibold text-slate-700 dark:text-slate-300">{loadLabel}</strong>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full ${loadColor} transition-all duration-300`} style={{ width: `${loadPct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Client Accounts Portfolio Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Client Accounts Portfolio
            </h2>
            <p className="text-[11px] text-slate-500">Live operational status across all accounts</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={portfolioSearch}
                onChange={e => setPortfolioSearch(e.target.value)}
                placeholder="Search accounts…"
                className="rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:border-[#0891b2] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={portfolioHealthFilter}
              onChange={e => setPortfolioHealthFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
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
                <th className="pb-3">Client</th>
                <th className="pb-3">Health</th>
                <th className="pb-3">Integrations</th>
                <th className="pb-3">Delivery Progress</th>
                <th className="pb-3">Lead</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {filteredPortfolioClients.map(c => {
                const oRag = overallRagLabel(
                  integRagLabel(c),
                  c.modules ? implAutoRag(c) : null,
                  c.workLog ? amsClientRag(c) : null
                );
                const total = c.integrations?.length || 0;
                const completed = (c.integrations || []).filter(i => i.status === 'Completed').length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900 dark:text-white">
                      <Link href="/integrations" className="hover:text-[#0891b2] transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
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
                    <td className="py-3.5 text-slate-600 dark:text-slate-400 font-mono">
                      {completed} / {total}
                    </td>
                    <td className="py-3.5 max-w-[160px]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-[#0891b2]" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-400">{c.masterAssignee || 'Team Kognoz'}</td>
                    <td className="py-3.5 text-right">
                      <Link
                        href="/integrations"
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-[#0891b2] hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#0891b2] dark:hover:text-white transition-all"
                      >
                        <span>Open</span>
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
