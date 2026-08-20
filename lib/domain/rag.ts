import { Client, Integration } from '@/types/client';
import { todayStr, daysDiff, isOverdueDate } from './date';

export type RagStatus = 'Red' | 'Amber' | 'Green';

export function isIntegrationStale(i: Integration, daysThreshold: number = 7): boolean {
  if (i.status === 'Completed' || i.status === 'Not Started') return false;
  const updates = i.timeline || [];
  if (!updates.length) return true;
  const latestDate = updates.reduce((acc, curr) => (curr.date > acc ? curr.date : acc), '');
  return daysDiff(latestDate) >= daysThreshold;
}

export function isIntegrationOverdue(i: Integration): boolean {
  if (i.status === 'Completed') return false;
  return isOverdueDate(i.dueDate);
}

export function integRagLabel(c: Client): RagStatus | null {
  const integs = c.integrations || [];
  if (!integs.length) return null;
  const ar = integs.filter(i => i.status === 'At Risk').length;
  const od = integs.filter(isIntegrationOverdue).length;
  if (ar > 0 || od > 0) return 'Red';
  const stale = integs.filter(i => isIntegrationStale(i, 7) && !isIntegrationOverdue(i)).length;
  if (stale > 0) return 'Amber';
  return 'Green';
}

export function implAutoRag(client: Client): RagStatus | null {
  let hasRed = false;
  let hasAmber = false;
  let hasInProgress = false;

  const modules = client.modules || [];
  modules.forEach(m => {
    (m.phases || []).forEach(ph => {
      if (ph.status === 'Completed' || ph.status === 'Not Started') return;
      hasInProgress = true;
      if (ph.status === 'At Risk') {
        hasRed = true;
        return;
      }
      if (ph.targetDate) {
        const d = daysDiff(ph.targetDate);
        if (d >= 14) {
          hasRed = true;
          return;
        }
        if (d >= 1) {
          hasAmber = true;
          return;
        }
      }
      const updates = ph.updates || [];
      if (!updates.length) {
        hasAmber = true;
        return;
      }
      const lastUpd = updates.reduce((a, u) => (u.date > a ? u.date : a), '');
      const daysAgo = lastUpd ? daysDiff(lastUpd) : 99;
      if (daysAgo >= 14) hasRed = true;
      else if (daysAgo >= 7) hasAmber = true;
    });
  });

  if (!hasInProgress && modules.length > 0) return 'Green';
  if (hasRed) return 'Red';
  if (hasAmber) return 'Amber';
  if (!hasInProgress) return null;
  return 'Green';
}

export function amsClientRag(client: Client): RagStatus | null {
  const entries = client.workLog || [];
  if (!entries.length) return null;
  const open = entries.filter(e => (e.entryStatus || 'Open') !== 'Closed');
  if (open.some(e => (e.queryLevel || '').includes('L4'))) return 'Red';
  if (open.some(e => e.dueDate && e.dueDate < todayStr())) return 'Red';

  const bucket = client.totalAvailableHours;
  const hasBucket = bucket !== undefined && bucket !== null && bucket > 0;
  const totalLogged = entries.reduce((a, e) => a + Number(e.hours || 0), 0);
  const balance = hasBucket ? bucket - totalLogged : null;
  if (hasBucket && balance !== null && balance <= Math.max(2, bucket * 0.15)) return 'Red';

  if (open.some(e => (e.queryLevel || '').includes('L3'))) return 'Amber';
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  const soonStr = threeDays.toISOString().slice(0, 10);
  if (open.some(e => e.dueDate && e.dueDate <= soonStr && e.dueDate >= todayStr())) return 'Amber';

  return 'Green';
}

export function overallRagLabel(...rags: (RagStatus | null | undefined)[]): RagStatus | null {
  const present = rags.filter((r): r is RagStatus => Boolean(r));
  if (!present.length) return null;
  if (present.includes('Red')) return 'Red';
  if (present.includes('Amber')) return 'Amber';
  return 'Green';
}
