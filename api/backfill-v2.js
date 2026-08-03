// api/backfill-v2.js — repair/resync tool. Populates (or re-syncs) the
// normalized v2 tables from what's actually in `clients` right now. The
// ongoing dual-write in write.js only fires on saves as they happen — this
// endpoint is the general-purpose way to catch up anything that predates
// dual-write, or anything a dual-write call silently failed on. Reuses the
// exact same decomposition logic (dualWriteClient) so this can never
// disagree with the ongoing dual-write on how a client's data gets shaped.
// Safe to run anytime, repeatedly — fully idempotent, and read-only against
// the real `clients` table (never writes to it, only to the six v2 tables).
//
// Batched (default 5 clients per call) to stay inside Vercel Hobby's
// 10-second function timeout.

const { validateToken } = require('./_auth');
const { applyCors } = require('./_cors');
const { logAudit, clientIp } = require('./_audit');
const { serverError } = require('./_errors');
const { dualWriteClient } = require('./_dualwrite');

const DEFAULT_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 20;

module.exports = async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTEGTRACK_SECRET } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !INTEGTRACK_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured: missing env vars' });
  }

  const token = req.headers['x-session-token'];
  const check = await validateToken(token, INTEGTRACK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  if (!check.valid) {
    return res.status(401).json({ error: 'Unauthorized', reason: check.reason });
  }
  if (check.payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const offset = Math.max(0, parseInt(req.body?.offset, 10) || 0);
  const limit = Math.min(MAX_BATCH_SIZE, Math.max(1, parseInt(req.body?.limit, 10) || DEFAULT_BATCH_SIZE));

  const sbHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?select=*&order=id.asc&limit=${limit}&offset=${offset}`,
      { headers: sbHeaders }
    );
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'Failed to read clients', detail: body.slice(0, 300) });
    }
    const rows = await r.json();

    const clients = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      manDayRate: row.man_day_rate,
      totalAvailableHours: row.total_available_hours,
      currency: row.currency,
      masterAssignee: row.master_assignee,
      integrations: row.integrations || [],
      modules: row.modules,
      workLog: row.work_log,
    }));

    const results = [];
    for (const client of clients) {
      try {
        await dualWriteClient({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, client, check.payload.username);
        results.push({ id: client.id, name: client.name, ok: true });
      } catch (err) {
        results.push({ id: client.id, name: client.name, ok: false, error: err.message });
      }
    }

    const done = rows.length < limit;
    const failedCount = results.filter(r => !r.ok).length;

    await logAudit({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, {
      actorId: check.payload.id,
      username: check.payload.username,
      role: check.payload.role,
      action: `Resynced v2 tables: offset ${offset}, ${results.length} clients (${failedCount} failed)`,
      entity: 'clients_v2',
      screen: 'admin',
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({
      ok: true,
      offset,
      limit,
      processed: results.length,
      failedCount,
      results,
      done,
      nextOffset: done ? null : offset + limit,
    });
  } catch (err) {
    return serverError(res, err, 'backfill-v2.js');
  }
};