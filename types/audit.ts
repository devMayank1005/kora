export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target?: string;
  details?: Record<string, any> | string;
  ip?: string;
}
