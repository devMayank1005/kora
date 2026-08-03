// api/_dualwrite.js — shadow-writes the normalized v2 tables alongside the
// real (original, jsonb-based) clients table. This is Phase 1 of the
// jsonb→columns migration: schema + write-side only. Nothing reads from
// _v2 yet. Every function here is best-effort — call sites in write.js wrap
// these in try/catch and never let a v2 failure affect the actual response
// to the user, since the original clients table remains the sole source
// of truth during this phase.
//
// Soft-delete only, everywhere: when an item present in the v2 tables is no
// longer in the incoming data (removed client-side), it gets archived
// (archived=true), never DELETEd. Every archiving UPDATE is scoped to the
// specific client_id (and parent id, one level down) it belongs to, so a
// bug here can never cross into another client's rows — this is the same
// class of bug as the original delete-by-omission incident, deliberately
// designed out from the start rather than patched in later.

async function sbFetch(env, path, options = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const r = await fetch(url, { ...options, headers });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`_dualwrite ${options.method || 'GET'} ${path} failed: ${r.status} ${body.slice(0, 300)}`);
  }
  return r;
}

async function upsertRows(env, table, rows) {
  if (!rows.length) return;
  await sbFetch(env, `${table}?on_conflict=id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}

async function archiveMissing(env, table, scopeCol, scopeVal, keepIds, actor) {
  const idList = keepIds.length ? keepIds.map(id => `"${encodeURIComponent(id)}"`).join(',') : '""';
  const filter = keepIds.length
    ? `${scopeCol}=eq.${encodeURIComponent(scopeVal)}&id=not.in.(${idList})&archived=eq.false`
    : `${scopeCol}=eq.${encodeURIComponent(scopeVal)}&archived=eq.false`;
  await sbFetch(env, `${table}?${filter}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true, archived_at: new Date().toISOString(), archived_by: actor || null }),
  });
}

async function dualWriteClient(env, client, actor) {
  const now = new Date().toISOString();

  await upsertRows(env, 'clients_v2', [{
    id: client.id,
    name: client.name,
    description: client.description || '',
    man_day_rate: client.manDayRate ?? null,
    total_available_hours: client.totalAvailableHours ?? null,
    currency: client.currency || 'INR',
    master_assignee: client.masterAssignee || null,
    updated_at: now,
  }]);

  const integrations = client.integrations || [];
  if (integrations.length || client.integrations !== undefined) {
    const integRows = integrations.map(i => ({
      id: i.id,
      client_id: client.id,
      name: i.name,
      status: i.status || 'Not Started',
      assignee: i.assignee || null,
      due_date: i.dueDate || null,
      description: i.description || '',
      next_action: i.nextAction || '',
      effort_weight: i.effortWeight ?? 0.5,
      activity_log: i.timeline || [],
      updated_at: now,
    }));
    await upsertRows(env, 'integrations_v2', integRows);
    await archiveMissing(env, 'integrations_v2', 'client_id', client.id, integrations.map(i => i.id), actor);

    const allMilestones = integrations.flatMap(i => (i.milestones || []).map(ms => ({ ...ms, _integId: i.id })));
    const msRows = allMilestones.map(ms => ({
      id: ms.id,
      integration_id: ms._integId,
      client_id: client.id,
      name: ms.name,
      status: ms.status || 'Pending',
      due_date: ms.dueDate || null,
      owner: ms.owner || null,
      notes: ms.notes || '',
      updated_at: now,
    }));
    await upsertRows(env, 'milestones_v2', msRows);
    await archiveMissing(env, 'milestones_v2', 'client_id', client.id, allMilestones.map(ms => ms.id), actor);
  }

  const modules = client.modules;
  if (modules !== undefined) {
    const modRows = (modules || []).map(m => ({ id: m.id, client_id: client.id, name: m.name, updated_at: now }));
    await upsertRows(env, 'modules_v2', modRows);
    await archiveMissing(env, 'modules_v2', 'client_id', client.id, (modules || []).map(m => m.id), actor);

    for (const m of (modules || [])) {
      const phases = m.phases || [];
      const phaseRows = phases.map(ph => ({
        id: ph.id || `${m.id}::${ph.name}`,
        module_id: m.id,
        client_id: client.id,
        phase_name: ph.name,
        status: ph.status || 'Not Started',
        assignee: ph.assignee || null,
        start_date: ph.startDate || null,
        target_date: ph.targetDate || null,
        current_activity: ph.currentActivity || '',
        next_action: ph.nextAction || '',
        activity_log: ph.updates || [],
        updated_at: now,
      }));
      await upsertRows(env, 'phases_v2', phaseRows);
      await archiveMissing(env, 'phases_v2', 'module_id', m.id, phaseRows.map(r => r.id), actor);
    }
  }

  const workLog = client.workLog;
  if (workLog !== undefined) {
    const entryRows = (workLog || []).map(e => ({
      id: e.id,
      client_id: client.id,
      date_raised: e.dateRaised,
      due_date: e.dueDate || null,
      raised_by: e.raisedBy || null,
      module: e.module || null,
      project: e.project || null,
      description: e.description || '',
      entry_type: e.type || null,
      query_level: e.queryLevel || null,
      entry_status: e.entryStatus || 'Open',
      rag_status: e.ragStatus || null,
      mode_of_support: e.modeOfSupport || null,
      dependencies: e.dependencies || '',
      solution: e.solution || '',
      hours: Number(e.hours || 0),
      edit_history: e.edits || [],
      updated_at: now,
    }));
    await upsertRows(env, 'ams_work_log_v2', entryRows);
    await archiveMissing(env, 'ams_work_log_v2', 'client_id', client.id, entryRows.map(r => r.id), actor);
  }
}

async function dualWriteClients(env, data, changedIds, actor) {
  if (!changedIds || !changedIds.length) return;
  const changedSet = new Set(changedIds);
  const changedClients = data.filter(c => changedSet.has(c.id));
  for (const client of changedClients) {
    await dualWriteClient(env, client, actor);
  }
}

async function archiveDeletedClients(env, clientIds, actor) {
  if (!clientIds || !clientIds.length) return;
  const now = new Date().toISOString();
  const archivePatch = { archived: true, archived_at: now, archived_by: actor || null };
  for (const clientId of clientIds) {
    const cid = encodeURIComponent(clientId);
    for (const table of ['integrations_v2', 'milestones_v2', 'modules_v2', 'phases_v2', 'ams_work_log_v2', 'clients_v2']) {
      const col = table === 'clients_v2' ? 'id' : 'client_id';
      await sbFetch(env, `${table}?${col}=eq.${cid}&archived=eq.false`, {
        method: 'PATCH',
        body: JSON.stringify(archivePatch),
      }).catch(err => console.error(`_dualwrite archiveDeletedClients: ${table} for ${clientId} failed:`, err.message));
    }
  }
}

module.exports = { dualWriteClients, archiveDeletedClients, dualWriteClient };