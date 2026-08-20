export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  locked?: boolean;
  failedAttempts?: number;
  tokenVersion?: number;
  createdAt?: string;
}

export interface AuthSession {
  token: string;
  user: User;
  usersSha?: string;
}
