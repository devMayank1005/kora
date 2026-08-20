'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiFetchClients } from '@/lib/api-client';
import { Client } from '@/types/client';
import { useUIStore } from '@/stores/uiStore';
import { Search, X, Building2, Boxes, Headphones, Layers, ArrowRight } from 'lucide-react';

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, toggleSidebar, setTheme, theme } = useUIStore();
  const [query, setQuery] = useState('');

  const { data: clients = [] } = useSWR<Client[]>('clients', () =>
    apiFetchClients().then(r => r.clients)
  );

  // Keyboard shortcut Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const cleanQ = query.trim().toLowerCase();

  // Search clients
  const matchedClients = cleanQ
    ? clients.filter(c => c.name.toLowerCase().includes(cleanQ)).slice(0, 4)
    : [];

  // Search integrations
  const matchedIntegrations: { client: Client; name: string; id: string }[] = [];
  if (cleanQ) {
    clients.forEach(c => {
      (c.integrations || []).forEach(i => {
        if (i.name.toLowerCase().includes(cleanQ)) {
          matchedIntegrations.push({ client: c, name: i.name, id: i.id });
        }
      });
    });
  }

  const navigateTo = (path: string) => {
    setCommandPaletteOpen(false);
    setQuery('');
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 pt-20 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-slate-100 px-4 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search clients, integrations, modules, or shortcuts…"
            className="flex-1 bg-transparent px-3 py-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {cleanQ && matchedClients.length === 0 && matchedIntegrations.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Matched Clients */}
          {matchedClients.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Clients</div>
              {matchedClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigateTo(`/integrations`)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-3.5 w-3.5 text-[#0e7490]" />
                    <span className="font-semibold">{c.name}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </button>
              ))}
            </div>
          )}

          {/* Matched Integrations */}
          {matchedIntegrations.slice(0, 4).length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Integrations</div>
              {matchedIntegrations.slice(0, 4).map(item => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(`/integrations`)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2.5">
                    <Boxes className="h-3.5 w-3.5 text-blue-600" />
                    <span>
                      <strong className="font-medium text-slate-900 dark:text-white">{item.name}</strong>{' '}
                      <span className="text-slate-400">({item.client.name})</span>
                    </span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </button>
              ))}
            </div>
          )}

          {/* Navigation Quick Actions */}
          {!cleanQ && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Navigation</div>
              <button
                onClick={() => navigateTo('/')}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                <Layers className="h-3.5 w-3.5 text-[#0e7490]" />
                <span>Go to Dashboard Overview</span>
              </button>
              <button
                onClick={() => navigateTo('/integrations')}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                <Boxes className="h-3.5 w-3.5 text-blue-600" />
                <span>Open Integrations Hub</span>
              </button>
              <button
                onClick={() => navigateTo('/ams')}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                <Headphones className="h-3.5 w-3.5 text-purple-600" />
                <span>Open AMS & Support Console</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
