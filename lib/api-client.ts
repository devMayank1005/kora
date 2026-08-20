import { Client } from '@/types/client';
import { User, AuthSession } from '@/types/user';
import { AuditLogEntry } from '@/types/audit';

const SESS_STORAGE_KEY = 'itk_sess';

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(atob(raw));
  } catch (e) {
    return null;
  }
}

export function persistSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESS_STORAGE_KEY, btoa(JSON.stringify(session)));
  } catch (e) {}
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESS_STORAGE_KEY);
  } catch (e) {}
}

export async function apiLogin(username: string, password: string): Promise<AuthSession> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid username or password');
  }

  const session: AuthSession = {
    token: data.token,
    user: data.user,
    usersSha: data.usersSha,
  };
  persistSession(session);
  return session;
}

export async function apiFetchClients(token?: string): Promise<{ clients: Client[]; sha: string }> {
  const effectiveToken = token || getStoredSession()?.token || '';
  const res = await fetch('/api/read?path=data/clients.json', {
    headers: { 'x-session-token': effectiveToken },
  });

  if (!res.ok) {
    throw new Error(`Failed to load clients (${res.status})`);
  }

  const json = await res.json();
  const decoded = atob(json.content);
  const clients: Client[] = JSON.parse(decoded);
  return { clients, sha: json.sha };
}

export async function apiFetchUsers(token?: string): Promise<{ users: User[]; sha: string }> {
  const effectiveToken = token || getStoredSession()?.token || '';
  const res = await fetch('/api/read?path=data/users.json', {
    headers: { 'x-session-token': effectiveToken },
  });

  if (!res.ok) {
    throw new Error(`Failed to load users (${res.status})`);
  }

  const json = await res.json();
  const decoded = atob(json.content);
  const users: User[] = JSON.parse(decoded);
  return { users, sha: json.sha };
}

export async function apiSaveClients(
  clients: Client[],
  changedIds: string[] = [],
  message: string = 'Updated clients'
): Promise<{ ok: boolean; sha?: string }> {
  const token = getStoredSession()?.token || '';
  const res = await fetch('/api/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': token,
    },
    body: JSON.stringify({
      path: 'data/clients.json',
      content: JSON.stringify(clients),
      changedIds,
      message,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error('Conflict: Client was updated by another user. Please refresh and retry.');
    }
    throw new Error(data.error || 'Failed to save changes');
  }

  return { ok: true, sha: data.sha };
}

export async function apiSaveUsers(
  users: User[],
  message: string = 'Updated users'
): Promise<{ ok: boolean; sha?: string }> {
  const token = getStoredSession()?.token || '';
  const res = await fetch('/api/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': token,
    },
    body: JSON.stringify({
      path: 'data/users.json',
      content: JSON.stringify(users),
      message,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save users');
  }

  return { ok: true, sha: data.sha };
}

export async function apiUploadAttachment(
  file: File
): Promise<{ url: string; path: string; name: string }> {
  const MAX_SIZE = 3 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max allowed is 3MB.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async e => {
      const base64 = (e.target?.result as string)?.split(',')[1];
      const token = getStoredSession()?.token || '';
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': token,
          },
          body: JSON.stringify({
            base64,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file on client'));
    reader.readAsDataURL(file);
  });
}
