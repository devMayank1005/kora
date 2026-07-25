// api/write.js — Supabase version
// No SHA needed — no conflicts possible. Last write wins per row.
// Frontend interface unchanged: POST with { path, content, sha, message }
// sha is accepted but ignored.
//
// SECURITY: see KORA_SECURITY_REMEDIATION_PLAN.md for the audit this file
// was rewritten against. Fixes landing in this file: C-1 (stored XSS via
// unvalidated id), H-1 (PostgREST filter injection), H-2 (delete-by-omission
// wipes all data), M-3 (password hashes trusted from client), M-6 (no
// server-side password policy), L-5 (bcrypt cost), L-6 (last-admin guard),
// L-1 (generic error responses).

const bcrypt = require('bcryptjs');
const { validateToken } = require('./_auth');
const { logAudit, clientIp } = require('./_audit');
const { applyCors } = require('./_cors');
const { assertIdsDeep, assertRole, assertPassword } = require('./_validate');
const { serverError } = require('./_errors');

const BCRYPT_COST = 12; // L-5: raised from 10. Existing hashes upgrade via the
                         // lazy-rehash path in login.js the next time each user logs in.

// H-2 fix: refuse a delete that would remove more than this fraction of a
// table's current rows in one call, unless the request explicitly confirms
// it. A single accidental or malicious `content:"[]"` write used to silently
// wipe every client with no warning and no confirmation step.
const BULK_DELETE_GUARD_RATIO = 0.2;

module.exports = async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTEGTRACK_SECRET } = process.env;

  const token = req.headers['x-session-token'];
  const check = await validateToken(token, INTEGTRACK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  if (!check.valid) {
    return res.status(401).json({ error: 'Unauthorized', reason: check.reason });
  }

  const { path, content, message, screen, confirmBulkDelete } = req.body || {};
  if (!path || content === undefined) {
    return res.status(400).json({ error: 'path and content required' });
  }

  // Server-side role enforcement — mirrors the UI's permission model instead
  // of just trusting the UI to hide buttons.
  if (check.payload.role === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot make changes' });
  }
  if (path === 'data/users.json' && check.payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const auditBase = {
    actorId: check.payload.id,
    username: check.payload.username,
    role: check.payload.role,
    screen: screen || null,
    ip: clientIp(req),
    userAgent: req.headers['user-agent'],
  };

  const sbHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
  };

  let data;
  try {
    data = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (err) {
    return res.status(400).json({ error: 'content must be valid JSON' });
  }

  try {
    if (path === 'data/clients.json') {
      // C-1 / H-1 fix: validate every id-shaped field anywhere in the payload
      // BEFORE it touches a query string or gets stored (and later rendered
      // back out unescaped on the frontend). This is the primary fix for
      // both the stored-XSS chain and the filter-injection bug — neither is
      // reachable if every id is provably a plain slug.
      assertIdsDeep(data, 'clients');

      const rows = data.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        created_at: c.createdAt || new Date().toISOString(),
        integrations: c.integrations || [],
        modules: c.modules !== undefined ? c.modules : null,
        work_log: c.workLog !== undefined ? c.workLog : null,
        man_day_rate: c.manDayRate || null,
        total_available_hours: c.totalAvailableHours || null,
        currency: c.currency || 'INR',
      }));

      // H-2 fix: check how many rows currently exist before allowing a
      // delete-by-omission to remove a large fraction of them.
      const countRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=id`, { headers: sbHeaders });
      const currentIds = countRes.ok ? (await countRes.json()).map(r => r.id) : [];
      const newIdSet = new Set(rows.map(r => r.id));
      const removedCount = currentIds.filter(id => !newIdSet.has(id)).length;
      if (
        currentIds.length > 0 &&
        removedCount / currentIds.length > BULK_DELETE_GUARD_RATIO &&
        !confirmBulkDelete
      ) {
        return res.status(409).json({
          error: `This would delete ${removedCount} of ${currentIds.length} clients. Resend with confirmBulkDelete: true if this is intentional.`,
          removedCount,
          currentCount: currentIds.length,
        });
      }

      if (rows.length > 0) {
        const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify(rows),
        });
        if (!upsertRes.ok) {
          const e = await upsertRes.json().catch(() => ({}));
          return res.status(upsertRes.status).json({ error: e.message || 'Save failed' });
        }
      }

      // Delete rows no longer present in the frontend array (client deletion).
      // H-1 fix: ids are already validated above (safe slug), and we still
      // encode defensively here so this remains safe even if that validation
      // is ever loosened by a future change.
      if (newIdSet.size > 0) {
        const idList = [...newIdSet].map(id => `"${encodeURIComponent(id)}"`).join(',');
        await fetch(
          `${SUPABASE_URL}/rest/v1/clients?id=not.in.(${idList})`,
          { method: 'DELETE', headers: { ...sbHeaders, Prefer: '' } }
        );
      } else {
        await fetch(
          `${SUPABASE_URL}/rest/v1/clients?id=neq.""`,
          { method: 'DELETE', headers: { ...sbHeaders, Prefer: '' } }
        );
      }

      await logAudit({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, {
        ...auditBase,
        action: message || 'Update clients',
        entity: 'clients',
      });

      return res.status(200).json({ sha: 'supabase' });
    }

    if (path === 'data/users.json') {
      assertIdsDeep(data, 'users');
      data.forEach(u => assertRole(u.role));

      // L-6 fix: never allow a write that leaves zero admins — that's an
      // unrecoverable lockout of the whole admin panel.
      if (!data.some(u => u.role === 'admin')) {
        return res.status(400).json({ error: 'At least one admin must remain' });
      }

      // M-3 fix: never trust a client-sent `passwordHash`. For any user
      // record that isn't setting a new plaintext password, look up the
      // existing hash server-side by id instead of accepting whatever the
      // browser sent — combined with removing passwordHash from read.js's
      // response, this means a hash is never in a browser's memory at all,
      // closing off the "steal an admin session, harvest every hash" chain.
      const idsNeedingLookup = data.filter(u => !u.password).map(u => u.id);
      let existingHashes = {};
      if (idsNeedingLookup.length) {
        const idList = idsNeedingLookup.map(id => `"${encodeURIComponent(id)}"`).join(',');
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=in.(${idList})&select=id,password_hash`,
          { headers: sbHeaders }
        );
        if (r.ok) {
          (await r.json()).forEach(row => { existingHashes[row.id] = row.password_hash; });
        }
      }

      const rows = await Promise.all(data.map(async u => {
        let password_hash;
        if (u.password) {
          assertPassword(u.password); // M-6 fix: enforced here too, not just in the UI/change-password endpoint
          password_hash = await bcrypt.hash(u.password, BCRYPT_COST);
        } else {
          password_hash = existingHashes[u.id];
          if (!password_hash) {
            const e = new Error(`No existing password set for user "${u.username || u.id}" — a password is required for a new user`);
            e.statusCode = 400;
            throw e;
          }
        }
        return {
          id: u.id,
          username: u.username,
          name: u.name,
          email: u.email || '',
          role: u.role,
          password_hash,
          created_at: u.createdAt || new Date().toISOString(),
        };
      }));

      if (rows.length > 0) {
        const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify(rows),
        });
        if (!upsertRes.ok) {
          const e = await upsertRes.json().catch(() => ({}));
          return res.status(upsertRes.status).json({ error: e.message || 'Save failed' });
        }
      }

      const newIds = rows.map(r => r.id);
      if (newIds.length > 0) {
        const idList = newIds.map(id => `"${encodeURIComponent(id)}"`).join(',');
        await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=not.in.(${idList})`,
          { method: 'DELETE', headers: { ...sbHeaders, Prefer: '' } }
        );
      }

      await logAudit({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, {
        ...auditBase,
        action: message || 'Update users',
        entity: 'users',
      });

      return res.status(200).json({ sha: 'supabase' });
    }

    return res.status(404).json({ error: `Unknown path: ${path}` });
  } catch (err) {
    return serverError(res, err, 'write.js');
  }
};