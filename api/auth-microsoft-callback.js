// api/auth-microsoft-callback.js — Microsoft redirects here after the
// person signs in (or cancels/fails) at login.microsoftonline.com.
//
// SECURITY GATE (the actual point of this whole feature): successfully
// signing in with Microsoft only proves the person controls that Microsoft
// identity — it does NOT by itself grant access to Kora. Access is only
// granted if that identity's email matches an existing row in Kora's own
// users table (see the ilike lookup below). No Kora account is ever
// created here, and nothing resembling a session is issued until after
// that check passes. This mirrors how the rest of the app enforces access
// server-side rather than trusting a UI to hide a button — see write.js's
// role checks for the same pattern.

const { signToken, verifySignature } = require('./_auth');
const { logAudit, clientIp } = require('./_audit');
const { applyCors, ALLOWED_ORIGINS } = require('./_cors');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // same session lifetime as password login (login.js) — SSO sessions are otherwise identical, same revocation via token_version
const TICKET_TTL_MS = 60 * 1000; // short-lived hand-off to the frontend, see auth-microsoft-exchange.js

module.exports = async function handler(req, res) {
  applyCors(req, res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTEGTRACK_SECRET } = process.env;
  const env = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
  const ip = clientIp(req), userAgent = req.headers['user-agent'];

  // Every failure path lands back on Kora's own login page (never
  // Microsoft, never an arbitrary attacker-influenced address) with a
  // generic, safe-to-show error code — mirrors login.js's L-1 fix (real
  // detail server-side only, via console.error at each call site below).
  async function bounceToLogin(fallbackOrigin, errorCode, auditAction) {
    if (auditAction) {
      try { await logAudit(env, { action: auditAction, entity: 'session', screen: 'login', ip, userAgent }); } catch (_) { }
    }
    const origin = ALLOWED_ORIGINS.includes(fallbackOrigin) ? fallbackOrigin : ALLOWED_ORIGINS[0];
    res.writeHead(302, { Location: `${origin}/?ssoError=${encodeURIComponent(errorCode)}` });
    return res.end();
  }

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_TENANT_ID || !INTEGTRACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return bounceToLogin(ALLOWED_ORIGINS[0], 'not_configured');
  }

  const { code, state, error: msftError } = req.query || {};

  if (msftError) {
    // Person cancelled at Microsoft's screen, or a Microsoft-side error
    // (e.g. admin consent required for this app in this tenant).
    return bounceToLogin(ALLOWED_ORIGINS[0], 'msft_' + String(msftError).slice(0, 40));
  }

  const statePayload = verifySignature(state, INTEGTRACK_SECRET);
  if (!statePayload || statePayload.purpose !== 'msftAuthState' || Date.now() > statePayload.exp) {
    // Wrong/expired/missing state — refuse rather than guess. This is the
    // CSRF check: without it, a stolen or replayed code+state pair from a
    // different login attempt could be played against a victim's browser.
    return bounceToLogin(ALLOWED_ORIGINS[0], 'state_invalid');
  }
  const origin = statePayload.origin;
  const redirectUri = `${origin}/api/auth-microsoft-callback`;

  if (!code) {
    return bounceToLogin(origin, 'no_code');
  }

  try {
    // 1) Exchange the one-time authorization code for tokens. redirect_uri
    // here must exactly match what auth-microsoft.js sent Microsoft.
    const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(AZURE_TENANT_ID)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email User.Read',
      }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '');
      console.error('auth-microsoft-callback: token exchange failed:', tokenRes.status, body.slice(0, 300));
      return bounceToLogin(origin, 'exchange_failed', 'Login failed: Microsoft token exchange error');
    }
    const tokenData = await tokenRes.json();

    // 2) Get the verified identity via Graph using the access token — this
    // way Microsoft itself vouches for the identity server-side, no
    // JWT/JWKS verification library needed on our end (none is in
    // package.json today, and this avoids adding one).
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName,id', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!meRes.ok) {
      console.error('auth-microsoft-callback: Graph /me failed:', meRes.status);
      return bounceToLogin(origin, 'graph_failed', 'Login failed: Microsoft profile lookup error');
    }
    const me = await meRes.json();
    // `mail` is null for some account/tenant configurations —
    // userPrincipalName is effectively always an email-shaped identifier,
    // used as the fallback.
    const azureEmail = (me.mail || me.userPrincipalName || '').trim();
    if (!azureEmail) {
      return bounceToLogin(origin, 'no_email', 'Login failed: Microsoft account has no usable email');
    }

    // 3) THE GATE. ilike (not eq) for a case-insensitive exact match —
    // Azure's casing for an email isn't guaranteed to match what's stored
    // in Kora. No fallback, no fuzzy match: anything other than a clean
    // match is a rejection.
    const sbHeaders = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };
    const userRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=ilike.${encodeURIComponent(azureEmail)}&select=*&limit=1`,
      { headers: sbHeaders }
    );
    if (!userRes.ok) {
      console.error('auth-microsoft-callback: user lookup failed:', userRes.status);
      return bounceToLogin(origin, 'lookup_failed', 'Login failed: user lookup error');
    }
    const rows = await userRes.json();
    if (!rows.length) {
      // Valid Microsoft identity, no matching Kora user — this is the
      // exact case this feature exists to stop at the door.
      return bounceToLogin(origin, 'not_authorized', `Login failed: Microsoft account (${azureEmail}) not in Kora user list`);
    }
    const user = rows[0];

    // Success — same token shape login.js issues, so every existing
    // endpoint's validateToken() treats an SSO session exactly like a
    // password session (same 7-day expiry, same token_version revocation,
    // same force-logout support, no other file needed to change).
    const iat = Date.now();
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.token_version || 0,
      iat,
      exp: iat + SEVEN_DAYS_MS,
    };
    const realToken = signToken(tokenPayload, INTEGTRACK_SECRET);
    const userOut = { id: user.id, username: user.username, name: user.name, email: user.email || '', role: user.role };

    await logAudit(env, { actorId: user.id, username: user.username, role: user.role, action: 'Login success (Microsoft SSO)', entity: 'session', screen: 'login', ip, userAgent });

    // Hand off through a short-lived ticket instead of putting the real
    // 7-day token straight in the URL — a URL persists in browser history
    // and proxy/server logs far longer than the few seconds this redirect
    // takes, so the ticket doesn't need that same lifetime. The frontend
    // exchanges it immediately (see auth-microsoft-exchange.js) and never
    // shows it in the address bar (stripped via history.replaceState).
    const ticket = signToken({ purpose: 'ssoTicket', realToken, user: userOut, iat, exp: iat + TICKET_TTL_MS }, INTEGTRACK_SECRET);
    res.writeHead(302, { Location: `${origin}/?ssoTicket=${encodeURIComponent(ticket)}` });
    return res.end();
  } catch (err) {
    console.error('auth-microsoft-callback error:', err && err.stack ? err.stack : err);
    return bounceToLogin(origin, 'unexpected_error');
  }
};