/**
 * Canonical date formatting and comparison utilities for Kora
 */

export function todayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  try {
    const parts = String(d).slice(0, 10).split('-');
    if (parts.length !== 3) return String(d);
    const [y, m, day] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(m, 10) - 1;
    return `${parseInt(day, 10)} ${months[mIdx] || m} ${y}`;
  } catch (e) {
    return String(d);
  }
}

export function fmtDateShort(d?: string | null): string {
  if (!d) return '—';
  try {
    const parts = String(d).slice(0, 10).split('-');
    if (parts.length !== 3) return String(d);
    const [, m, day] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(m, 10) - 1;
    return `${parseInt(day, 10)} ${months[mIdx] || m}`;
  } catch (e) {
    return String(d);
  }
}

export function daysDiff(targetDate?: string | null): number {
  if (!targetDate) return 0;
  const target = new Date(targetDate.slice(0, 10));
  const today = new Date(todayStr());
  return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdueDate(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  return dueDate.slice(0, 10) < todayStr();
}

export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const diffDays = daysDiff(dateStr);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 0) return `${diffDays}d ago`;
  return `in ${Math.abs(diffDays)}d`;
}
