// api/auth-microsoft-exchange.js — the frontend calls this immediately
// after landing back on / with ?ssoTicket=... (see events.js init()).
// Exchanges the short-lived ticket for the real session token. Same
// response shape as POST /api/login ({ token, user, usersSha }), so the
// frontend's existing post-login bootstrap (finishLogin in events.js)
// handles both a password login and an SSO login identically.

const { verifySignature } = require('./_auth');
const { applyCors } = require('./_cors');

module.exports = async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { INTEGTRACK_SECRET } = process.env;
  if (!INTEGTRACK_SECRET) return res.status(500).json({ error: 'Server misconfigured' });

  const { ticket } = req.body || {};
  if (!ticket) return res.status(400).json({ error: 'ticket required' });

  const payload = verifySignature(ticket, INTEGTRACK_SECRET);
  // purpose check matters here specifically: verifySignature alone just
  // confirms "signed with our secret" — without checking purpose, a real
  // session token (also signed with the same secret) would otherwise pass
  // this check too. exp is a plain ms-timestamp compare, same convention
  // _auth.js's validateToken uses for the real session tokens.
  if (!payload || payload.purpose !== 'ssoTicket' || Date.now() > payload.exp) {
    return res.status(401).json({ error: 'Sign-in link expired or invalid. Please try Microsoft sign-in again.' });
  }

  return res.status(200).json({ token: payload.realToken, user: payload.user, usersSha: 'supabase' });
};