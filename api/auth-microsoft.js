// api/auth-microsoft.js — starts the "Sign in with Microsoft 365" flow.
// GET only (this is a full-page browser redirect the login button's <a>
// triggers, not a fetch/XHR call from our own frontend JS) — sends the
// browser on to Microsoft's login page.
//
// Whoever signs in at Microsoft still has to already be a Kora user by
// email (checked in auth-microsoft-callback.js) — this endpoint only starts
// the identity handshake and grants nothing on its own.

const { signToken } = require('./_auth');
const { applyCors, ALLOWED_ORIGINS } = require('./_cors');

const STATE_TTL_MS = 10 * 60 * 1000; // 10 min — enough time for Microsoft's login/MFA/consent screens, short enough to keep the CSRF-state replay window small

module.exports = async function handler(req, res) {
  applyCors(req, res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { AZURE_CLIENT_ID, AZURE_TENANT_ID, INTEGTRACK_SECRET } = process.env;
  if (!AZURE_CLIENT_ID || !AZURE_TENANT_ID || !INTEGTRACK_SECRET) {
    return res.status(500).json({ error: 'Microsoft sign-in is not configured on this server.' });
  }

  // The redirect_uri sent to Microsoft has to exactly match one registered
  // on the Azure app AND exactly match what auth-microsoft-callback.js uses
  // during token exchange. Rather than trusting req.headers.host blindly
  // (classic host-header-injection risk — this value ends up embedded in an
  // outbound URL), it's only ever built from Kora's own known-good origins
  // — the same allow-list _cors.js already maintains. This also means both
  // real Kora deploy domains work with no extra env var, as long as both
  // are registered as Redirect URIs on the Azure app (Authentication ->
  // Redirect URIs -> Web -> add both, each ending in
  // /api/auth-microsoft-callback).
  const candidateOrigin = `https://${req.headers.host}`;
  if (!ALLOWED_ORIGINS.includes(candidateOrigin)) {
    return res.status(400).json({ error: 'This domain is not configured for Microsoft sign-in.' });
  }
  const redirectUri = `${candidateOrigin}/api/auth-microsoft-callback`;

  // State is a short-lived signed token, not server-stored — consistent
  // with the rest of this serverless app having no session store of its
  // own. It carries the exact origin/redirect_uri this request used, so
  // the callback can reconstruct an identical redirect_uri for the token
  // exchange without trusting a second, later Host header.
  const iat = Date.now();
  const state = signToken({ purpose: 'msftAuthState', origin: candidateOrigin, iat, exp: iat + STATE_TTL_MS }, INTEGTRACK_SECRET);

  const authUrl = new URL(`https://login.microsoftonline.com/${encodeURIComponent(AZURE_TENANT_ID)}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set('client_id', AZURE_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', 'openid profile email User.Read');
  authUrl.searchParams.set('state', state);

  res.writeHead(302, { Location: authUrl.toString() });
  return res.end();
};