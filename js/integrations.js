// ─── CLIENT LIST — replaced by the 3-column renderClientDetail below,
// which now also handles the bare "no client selected yet" case ───
function parseIntegrationsCsv(text, existingIntegs = []) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const hasHeader = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('integration');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line, i) => {
    const p = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const [name, status, assignee, due_date, description, next_action] = p;
    let error = null;
    if (!name) error = 'name required';
    else if (existingIntegs.find(x => x.name.toLowerCase() === name.toLowerCase())) error = `"${name}" already exists`;
    return { name: name || '', status: STATUSES.includes(status) ? status : 'Not Started', assignee: assignee || '', dueDate: due_date || '', description: description || '', nextAction: next_action || '', error, row: i + (hasHeader ? 2 : 1) };
  });
}

function renderClientDetail(clientId) {
  const inIntegDomain = x => x.integrations.length > 0 || (x.modules === undefined && x.workLog === undefined);
  const allClients = S.clients.filter(inIntegDomain);
  const c = S.clients.find(x => x.id === clientId) || allClients[0];
  if (!c) return `<div class="k-page fade"><div class="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400 text-sm">${emptyIcon('inbox')}No clients yet. <button data-act="modal-open" data-modal="add-client" class="text-[#0e7490] font-medium ml-1">Add one</button></div></div>`;
  const fl = S.filter === 'all' ? c.integrations : c.integrations.filter(i => i.status === S.filter);
  const sorted = sortIntegs(fl);
  const cols = [['name', 'Integration'], ['status', 'Status'], ['assignee', 'Assignee'], ['due', 'Due Date'], ['lastUpdate', 'Last Update']];

  // ── COLUMN 1: client bento rail — the new piece. Clicking a card here
  // updates the URL (navigate keeps view='client-detail', just swaps clientId)
  // so the page stays bookmarkable/shareable per the app's existing principle,
  // without introducing a separate list-then-detail page navigation.
  const clientRail = `<div class="bg-white rounded-2xl border border-gray-100 overflow-y-auto" style="max-height:calc(100vh - 112px);">
    <div class="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
      <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">${allClients.length} Client${allClients.length !== 1 ? 's' : ''}</span>
      <button data-act="modal-open" data-modal="add-client" title="Add Client" class="text-[#0e7490] text-lg leading-none font-bold">+</button>
    </div>
    ${allClients.map(cl => {
    const ar = cl.integrations.filter(i => i.status === 'At Risk').length;
    const total = cl.integrations.length;
    const active = cl.id === c.id;
    return `<div data-act="open-client" data-id="${esc(cl.id)}" class="px-3 py-2.5 border-b border-gray-50 cursor-pointer transition ${active ? 'bg-[#0e7490]/5 border-l-2 border-l-[#0e7490]' : 'border-l-2 border-l-transparent hover:bg-gray-50'}">
      <div class="text-sm font-semibold truncate" style="color:${active ? '#0e7490' : '#111827'}">${esc(cl.name)}</div>
      <div class="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
        <span>${total} integration${total !== 1 ? 's' : ''}</span>
        ${ar ? `<span class="text-rose-600 font-semibold">· ${ar} at risk</span>` : ''}
      </div>
    </div>`;
  }).join('')}
  </div>`;

  // ── COLUMNS 2+3: unchanged from the existing, already-shipped master-detail —
  // reused verbatim, just no longer carrying its own top-level page header
  // (that's now Column 1's job) since this is nested inside the 3-column grid.
  const listAndDetail = `<div>
  <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
    <div><h1 class="text-xl font-bold text-gray-900">${esc(c.name)}</h1>${c.description ? `<p class="text-sm text-gray-400 mt-0.5">${esc(c.description)}</p>` : ''}</div>
    <div class="flex items-center gap-2">
    ${can('admin') ? `<button data-act="toggle-bulk-integ" data-cid="${esc(c.id)}" class="whitespace-nowrap text-sm font-medium px-4 py-2 rounded-xl transition ${S.bulkIntegMode && S.bulkIntegCid === c.id ? 'bg-rose-50 border border-rose-200 text-rose-600' : 'border border-gray-200 text-gray-600 hover:border-gray-300'}">${S.bulkIntegMode && S.bulkIntegCid === c.id ? '✕ Cancel' : '☑ Select'}</button>` : ''}
    ${exportMenuButton(`integ-${c.id}`, [
    { label: '📊 PowerPoint', act: 'exp-pptx', data: { cid: c.id } },
    { label: '📄 PDF', act: 'exp-pdf', data: { cid: c.id } },
    { label: '📋 Excel (Integrations)', act: 'exp-excel', data: { etype: 'integrations', cid: c.id } },
    { label: '🎯 Excel (Milestones)', act: 'exp-excel', data: { etype: 'milestones', cid: c.id } },
    { label: '⬆ Import Integrations (CSV)', act: 'open-import-integ', data: { cid: c.id } },
  ])}
    </div>
  </div>
  <div class="flex gap-2 overflow-x-auto pb-1 mb-4 items-center">
    ${['all', ...STATUSES].map(st => `<button data-act="filter" data-filter="${st}" class="whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full transition ${S.filter === st ? 'bg-[#0e7490] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0e7490]/40'}">${st === 'all' ? `All (${c.integrations.length})` : esc(st) + ` (${c.integrations.filter(i => i.status === st).length})`}</button>`).join('')}
    <button data-act="modal-open" data-modal="add-integ" data-cid="${esc(c.id)}" class="whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 ml-auto">+ Add Integration</button>
  </div>
  ${S.bulkIntegMode && S.bulkIntegCid === c.id ? `<div class="flex items-center gap-3 mb-3 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl">
    <span class="text-sm text-rose-700 font-medium">Select integrations to delete</span>
  </div>`: ''}
  ${(() => {
      const bulkOn = S.bulkIntegMode && S.bulkIntegCid === c.id;
      if (!sorted.length) return `<div class="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400 text-sm">${emptyIcon('search')}No integrations match this filter</div>`;
      const selId = S.selectedIntegId && sorted.some(i => i.id === S.selectedIntegId) ? S.selectedIntegId : sorted[0].id;
      const sel = sorted.find(i => i.id === selId);
      const lu = lastUpdateDate(sel);
      return `<div class="bg-white rounded-2xl border border-gray-100 overflow-hidden grid grid-cols-5${bulkOn ? ' ring-2 ring-rose-300' : ''}" style="min-height:420px;">
    <div class="col-span-2 border-r border-gray-100 overflow-y-auto" style="max-height:640px;">
      <div class="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide sticky top-0 flex items-center justify-between">
        <span>${sorted.length} integration${sorted.length !== 1 ? 's' : ''}</span>
        ${bulkOn ? `<input type="checkbox" data-act="toggle-bulk-integ-all" data-cid="${esc(c.id)}" ${sorted.every(i => S.bulkIntegSelected.has(i.id)) ? 'checked' : ''} class="rounded"/>` : `<select data-act="integ-sort-select" class="text-[10px] border-none bg-transparent text-gray-400 focus:outline-none">${cols.map(([k, l]) => `<option value="${esc(k)}"${S.sort.key === k ? ' selected' : ''}>${l}</option>`).join('')}</select>`}
      </div>
      ${sorted.map(i => {
        const active = i.id === selId;
        return `<div ${bulkOn ? `data-act="toggle-bulk-integ-row" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}"` : `data-act="select-integ" data-iid="${esc(i.id)}"`} class="px-3 py-2.5 border-b border-gray-50 cursor-pointer transition flex items-start gap-2 ${active && !bulkOn ? 'bg-[#0e7490]/5 border-l-2 border-l-[#0e7490]' : 'border-l-2 border-l-transparent hover:bg-gray-50'}">
          ${bulkOn ? `<input type="checkbox" ${S.bulkIntegSelected.has(i.id) ? 'checked' : ''} class="rounded mt-0.5" onclick="event.stopPropagation()" data-act="toggle-bulk-integ-row" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}"/>` : ''}
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-baseline gap-2">
              <span class="text-xs font-medium text-gray-900 truncate">${esc(i.name)}</span>
              <span class="text-xs shrink-0 ${isOverdue(i) ? 'text-rose-600 font-semibold' : 'text-gray-400'}">${fmtDate(i.dueDate)}</span>
            </div>
            <div class="text-xs text-gray-500 truncate mt-0.5">${i.description ? esc(i.description) : '—'}</div>
            <div class="flex gap-1.5 mt-1.5">${sbadge(i.status)}${overdueBadge(i)}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="col-span-3 p-5 overflow-y-auto" style="max-height:640px;">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap">${sbadge(sel.status)}${overdueBadge(sel)}</div>
        <button data-act="open-integ" data-cid="${esc(c.id)}" data-iid="${esc(sel.id)}" class="text-xs font-medium text-[#0e7490] border border-[#0e7490]/30 rounded-lg px-3 py-1.5 hover:bg-[#0e7490]/5 transition">Open Full Record →</button>
      </div>
      <h3 class="text-base font-semibold text-gray-900 mb-1">${esc(sel.name)}</h3>
      <div class="text-sm text-gray-600 mb-4 leading-relaxed">${sel.description ? esc(sel.description) : '—'}</div>
      <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-xs pt-4 border-t border-gray-100">
        <div><span class="text-gray-400">Status</span><div class="mt-1">${can('editor') ? `<select data-act="inline-status" data-cid="${esc(c.id)}" data-iid="${esc(sel.id)}" class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0e7490]">${STATUSES.map(s => `<option value="${esc(s)}"${s === sel.status ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>` : sbadge(sel.status)}</div></div>
        <div><span class="text-gray-400">Assignee</span><div class="mt-1">${can('editor') ? `<select data-act="inline-assignee" data-cid="${esc(c.id)}" data-iid="${esc(sel.id)}" class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0e7490] max-w-[160px]">${assigneeOptionsOnly(sel.assignee)}</select>` : `<span class="text-sm text-gray-700 font-medium">${esc(sel.assignee || '—')}</span>`}</div></div>
        <div><span class="text-gray-400">Due Date</span><div class="text-sm text-gray-700 font-medium mt-1">${fmtDate(sel.dueDate)}</div></div>
        <div><span class="text-gray-400">Effort</span><div class="mt-1">${can('editor') ? `<select data-act="inline-effort" data-cid="${esc(c.id)}" data-iid="${esc(sel.id)}" class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0e7490]"><option value="1"${sel.effortWeight === 1 ? ' selected' : ''}>Heavy — 1.0</option><option value="0.5"${(sel.effortWeight === 0.5 || sel.effortWeight === undefined) ? ' selected' : ''}>Medium — 0.5</option><option value="0.25"${sel.effortWeight === 0.25 ? ' selected' : ''}>Light — 0.25</option></select>` : `<span class="text-sm text-gray-700 font-medium">${sel.effortWeight ?? 0.5}</span>`}</div></div>
        <div><span class="text-gray-400">Last Update</span><div class="text-sm text-gray-700 font-medium mt-1">${lu ? fmtDate(lu) : '<span class="text-amber-600 text-xs font-medium">No updates</span>'}</div></div>
        <div class="col-span-2"><span class="text-gray-400">Next Action</span><div class="text-sm text-gray-700 font-medium mt-1">${sel.nextAction ? esc(sel.nextAction) : '—'}</div></div>
      </div>
      <div class="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-400">Activity feed &amp; milestones live on the full record — use "Open Full Record →" above.</div>
    </div>
  </div>`;
    })()}
  ${S.bulkIntegMode && S.bulkIntegCid === c.id ? `<div class="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-xl px-6 py-4 flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-700">${S.bulkIntegSelected.size}</div>
      <div>
        <div class="font-semibold text-gray-900 text-sm">${S.bulkIntegSelected.size === 0 ? 'No integrations selected' : S.bulkIntegSelected.size === 1 ? '1 integration selected' : `${S.bulkIntegSelected.size} integrations selected`}</div>
        <div class="text-xs text-gray-400">This cannot be undone</div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button data-act="toggle-bulk-integ" data-cid="${esc(c.id)}" class="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition">Cancel</button>
      <button data-act="bulk-delete-integ" data-cid="${esc(c.id)}" ${S.bulkIntegSelected.size === 0 ? 'disabled class="bg-gray-100 text-gray-400 text-sm font-semibold px-5 py-2 rounded-xl cursor-not-allowed"' : 'class="bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"'}>
        🗑 Delete ${S.bulkIntegSelected.size || ''} Selected
      </button>
    </div>
  </div>
  <div class="h-20"></div>`: ''}
</div>`;

  // ── 3-COLUMN ASSEMBLY: Column 1 (client rail) | Columns 2+3 (existing, reused) ──
  return `<div class="k-page fade">
  <div class="grid gap-4" style="grid-template-columns:240px 1fr;align-items:start;">
    ${clientRail}
    ${listAndDetail}
  </div>
</div>`;
}

// ─── INTEG DETAIL ─────────────────────────────────────────────────
function renderIntegDetail(clientId, integId) {
  const c = S.clients.find(x => x.id === clientId);
  const i = c?.integrations.find(x => x.id === integId);
  if (!c || !i) return `<div class="p-8 text-gray-400">Not found</div>`;
  return `<div class="max-w-6xl mx-auto px-6 py-7 fade">
  <div class="flex items-center gap-3 mb-2 flex-wrap">
    <h1 class="text-xl font-bold text-gray-900">${esc(i.name)}</h1>${sbadge(i.status)}${overdueBadge(i)}
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
    <div class="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 class="font-semibold text-gray-900 mb-4 text-sm">Details</h3>
      <div class="space-y-4">
        <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
          ${can('edit') ? `<select id="f-status" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490]">${STATUSES.map(s => `<option${s === i.status ? ' selected' : ''}>${s}</option>`).join('')}</select>` : sbadge(i.status)}
        </div>
        <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Assignee</label>
          ${can('edit') ? assigneeSelect('f-assignee', i.assignee || '') :
      `<p class="text-sm text-gray-700">${esc(i.assignee || '—')}</p>`}
        </div>
        <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Due Date</label>
          ${can('edit') ? `<input id="f-due" type="date" value="${esc(i.dueDate || '')}" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490]"/>` :
      `<p class="text-sm text-gray-700">${fmtDate(i.dueDate)}</p>`}
        </div>
        <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
          ${can('edit') ? `<textarea id="f-desc" rows="4" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490] resize-none">${esc(i.description || '')}</textarea>` :
      `<p class="text-sm text-gray-700 leading-relaxed">${esc(i.description || '—')}</p>`}
        </div>
        <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Next Action</label>
          ${can('edit') ? `<textarea id="f-next" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490] resize-none">${esc(i.nextAction || '')}</textarea>` :
      `<p class="text-sm text-gray-700">${esc(i.nextAction || '—')}</p>`}
        </div>
        ${can('edit') ? `<button data-act="save-integ" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" class="w-full btn-grad text-white font-semibold rounded-xl py-2.5 text-sm transition flex items-center justify-center gap-2">Save Details <kbd class="text-[10px] font-normal opacity-60 border border-white/30 rounded px-1.5 py-0.5">${kbdHint('S')}</kbd></button>` : ''}
        ${can('edit') && i.status !== 'Completed' ? `<button data-act="mark-complete" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" class="w-full text-green-700 bg-green-50 hover:bg-green-100 font-medium rounded-xl py-2 text-xs transition">✓ Mark as Complete</button>` : ''}
        ${can('admin') ? `<button data-act="delete-integ" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" class="w-full text-rose-400 hover:text-rose-600 text-xs py-1 transition">Delete Integration</button>` : ''}
      </div>
    </div>
    <div class="bg-white rounded-2xl border border-gray-100 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
          <svg class="w-4 h-4 text-[#0e7490]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          Activity <span class="text-gray-400 font-normal">(${i.timeline?.length || 0})</span>
        </h3>
      </div>
      ${can('edit') ? `<div class="flex gap-2.5 mb-4">
        ${avatarChip(S.user?.name)}
        <div class="flex-1 min-w-0">
          <div class="bg-gray-50 rounded-2xl rounded-tl-md px-3.5 py-2.5">
            <textarea id="tl-input" rows="2" placeholder="Post an update…" class="w-full bg-transparent text-sm resize-none outline-none"></textarea>
          </div>
          <div class="flex items-center gap-3 mt-1.5 pl-1">
            <span class="text-[11px] text-gray-400">Posts immediately — no need to Save Details</span>
            <div class="flex-1"></div>
            <button data-act="add-timeline" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" title="Post update" class="w-8 h-8 rounded-full bg-[#0e7490] hover:bg-[#0d3d4f] flex items-center justify-center transition shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5M5 12l7-7 7 7"/></svg>
            </button>
          </div>
        </div>
      </div>`: ''}
      <div class="space-y-4 max-h-[440px] overflow-y-auto pr-1">
        ${!(i.timeline?.length) ? `<div class="text-sm text-gray-400 text-center py-8">${emptyIcon('clock')}No updates yet</div>` :
      i.timeline.map((t, idx, arr) => {
        const isEditing = S.editingTimelineId === t.id;
        const hasHistory = t.edits && t.edits.length > 0;
        const isExpanded = S.expandedHistory.has(t.id);
        if (isEditing) {
          return `<div class="flex gap-2.5">
              ${avatarChip(t.addedBy)}
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-[#0e7490] mb-1">${esc(t.date)} · ${esc(t.addedBy || '')}</div>
                <textarea id="edit-tl-${t.id}" rows="3" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490] resize-none">${esc(t.update)}</textarea>
                <div class="flex gap-2 mt-2">
                  <button data-act="cancel-edit-timeline" class="flex-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition">Cancel</button>
                  <button data-act="save-edit-timeline" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" data-tid="${esc(t.id)}" class="flex-1 text-xs font-semibold text-white bg-[#0e7490] rounded-lg py-1.5 hover:bg-[#0d3d4f] transition">Save Edit</button>
                </div>
              </div>
            </div>`;
        }
        return `<div class="flex gap-2.5">
          ${avatarChip(t.addedBy)}
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-900">${esc(t.addedBy || 'Unknown')}</span>
              <span class="text-xs text-gray-400">${esc(t.date)}${t.addedAt ? ` · ${fmtDate(t.addedAt)}` : ''}</span>
              ${hasHistory ? `<button data-act="toggle-history" data-tid="${esc(t.id)}" class="text-xs text-amber-600 hover:text-amber-700 font-medium">edited${t.edits.length > 1 ? ` (${t.edits.length}×)` : ''} — ${isExpanded ? 'hide' : 'view'}</button>` : ''}
            </div>
            <div class="bg-gray-50 rounded-2xl rounded-tl-md px-3.5 py-2.5 mt-1 text-sm text-gray-700 leading-relaxed">${esc(t.update)}</div>
            <div class="flex items-center gap-3 mt-1.5 pl-1">
              ${can('edit') ? `<button data-act="edit-timeline" data-tid="${esc(t.id)}" class="text-[11px] text-gray-400 hover:text-[#0e7490]">Edit</button>` : ''}
              ${can('admin') ? `<button data-act="delete-timeline-entry" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" data-tid="${esc(t.id)}" class="text-[11px] text-gray-400 hover:text-rose-500">Delete</button>` : ''}
              <button data-act="copy-update" data-text="${esc(t.update)}" class="text-[11px] text-gray-400 hover:text-[#0e7490]">Copy</button>
            </div>
            ${isExpanded && hasHistory ? `<div class="mt-2 pl-3 border-l-2 border-amber-200 space-y-2">
              ${[...t.edits].reverse().map(e => `<div class="text-xs"><div class="text-gray-400 mb-0.5">${fmtDate(e.editedAt)} · ${esc(e.editedBy || '')} changed it from:</div><div class="text-gray-500">${esc(e.text)}</div></div>`).join('')}
            </div>`: ''}
          </div>
        </div>`;
      }).join('')}
      </div>
    </div>
  </div>
  <div class="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-gray-900 text-sm">Milestones</h3>
      ${can('edit') ? `<button data-act="add-milestone-btn" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" class="text-xs text-[#0e7490] font-semibold border border-[#0e7490]/30 bg-[#0e7490]/5 px-3 py-1.5 rounded-xl hover:bg-[#0e7490]/10 transition">+ Add Milestone</button>` : ''}
    </div>
    ${(i.milestones || []).length ? `<div class="space-y-2">
      ${(i.milestones || []).map(ms => {
        const msColor = ms.status === 'Achieved' ? 'green' : ms.status === 'Missed' ? 'rose' : 'amber';
        return `<div class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition">
          <div class="w-2 h-2 rounded-full bg-${msColor}-500 shrink-0"></div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900">${esc(ms.name)}</div>
            <div class="text-xs text-gray-400 mt-0.5">${ms.owner ? `Owner: ${esc(ms.owner)} · ` : ''}${ms.dueDate ? `Due: ${fmtDate(ms.dueDate)}` : 'No due date'}${ms.notes ? ` · ${esc(ms.notes)}` : ''}</div>
          </div>
          <span class="text-xs font-semibold bg-${msColor}-50 text-${msColor}-700 border border-${msColor}-200 px-2 py-0.5 rounded-full shrink-0">${ms.status}</span>
          ${can('edit') ? `<div class="flex gap-2 shrink-0">
            <button data-act="edit-milestone-btn" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" data-mid="${esc(ms.id)}" class="text-xs text-gray-300 hover:text-[#0e7490]">Edit</button>
            ${can('admin') ? `<button data-act="delete-milestone" data-cid="${esc(c.id)}" data-iid="${esc(i.id)}" data-mid="${esc(ms.id)}" class="text-xs text-gray-300 hover:text-rose-500">Delete</button>` : ''}
          </div>`: ''}
        </div>`;
      }).join('')}
    </div>`: `<div class="text-center py-8 text-gray-400 text-sm">No milestones yet. Add key checkpoints for this integration.</div>`}
  </div>
</div>`;
}