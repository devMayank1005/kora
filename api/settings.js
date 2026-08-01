// api/settings.js — small key/value settings store, starting with capacity
// weights for the Team Bandwidth dashboard section.
//
// GET: any authenticated role can read (the Bandwidth view needs these to
//   compute everyone's load, not just admins).
// POST: admin-only, upserts one settings key. Audit-logged like every other
//   write in the app.

const { validateToken } = require('./_auth');
const { applyCors } = require('./_cors');
const { logAudit, clientIp } = require('./_audit');
const { serverError } = require('./_errors');

const ALLOWED_KEYS = ['capacity_weights']; // whitelist — settings.js is generic-shaped but only this key exists today

const DEFAULT_CAPACITY_WEIGHTS = { module: 1, pmo: 0.5, ams: 0.25, cap: 5 };

module.exports = async function handler(req, res) {
    applyCors(req, res, 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTEGTRACK_SECRET } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !INTEGTRACK_SECRET) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    const token = req.headers['x-session-token'];
    const check = await validateToken(token, INTEGTRACK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    if (!check.valid) {
        return res.status(401).json({ error: 'Unauthorized', reason: check.reason });
    }

    const sbHeaders = {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
    };

    if (req.method === 'GET') {
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.capacity_weights&select=*`, { headers: sbHeaders });
            if (!r.ok) return res.status(r.status).json({ error: 'Settings read error' });
            const rows = await r.json();
            const value = rows[0]?.value || DEFAULT_CAPACITY_WEIGHTS;
            return res.status(200).json({ capacityWeights: { ...DEFAULT_CAPACITY_WEIGHTS, ...value } });
        } catch (err) {
            return serverError(res, err, 'settings.js GET');
        }
    }

    if (req.method === 'POST') {
        if (check.payload.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can change capacity settings' });
        }

        const { key, value } = req.body || {};
        if (!ALLOWED_KEYS.includes(key)) {
            return res.status(400).json({ error: 'Unknown settings key' });
        }
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return res.status(400).json({ error: 'value must be an object' });
        }
        // Sanity-check capacity_weights specifically — every number, all positive, cap reasonable.
        if (key === 'capacity_weights') {
            for (const k of ['module', 'pmo', 'ams', 'cap']) {
                const n = Number(value[k]);
                if (!Number.isFinite(n) || n <= 0 || n > 50) {
                    return res.status(400).json({ error: `Invalid value for ${k}` });
                }
            }
        }

        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
                method: 'POST',
                headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify([{ key, value, updated_at: new Date().toISOString(), updated_by: check.payload.username }]),
            });
            if (!r.ok) return res.status(r.status).json({ error: 'Settings write failed' });

            await logAudit({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, {
                actorId: check.payload.id,
                username: check.payload.username,
                role: check.payload.role,
                action: `Updated setting: ${key}`,
                entity: 'app_settings',
                screen: 'dashboard',
                ip: clientIp(req),
                userAgent: req.headers['user-agent'],
            });

            return res.status(200).json({ ok: true });
        } catch (err) {
            return serverError(res, err, 'settings.js POST');
        }
    }

    return res.status(405).json({ error: 'GET or POST only' });
};