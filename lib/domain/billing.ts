import { Client, WorkLogEntry } from '@/types/client';

export interface AmsTotals {
  totalHours: number;
  allTimeHours: number;
  hasBucket: boolean;
  hasRate: boolean;
  bucketHours: number;
  balanceAvailable: number | null;
  billableHours: number;
  billableDays: number;
  ratePerDay: number;
  ratePerHour: number;
  amount: number;
  currency: string;
}

export function calculateAmsTotals(
  client: Client,
  fromDate?: string,
  toDate?: string
): AmsTotals {
  const allLog = client.workLog || [];
  const log = allLog.filter(e => {
    const d = e.dateRaised || '';
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
  });

  const totalHours = log.reduce((a, e) => a + Number(e.hours || 0), 0);
  const allTimeHours = allLog.reduce((a, e) => a + Number(e.hours || 0), 0);
  const bucket = client.totalAvailableHours;
  const hasBucket = bucket !== undefined && bucket !== null && bucket > 0;
  const hasRate = !!(client.manDayRate && client.manDayRate > 0);
  const ratePerDay = client.manDayRate || 0;
  const ratePerHour = ratePerDay / 8;
  const currency = client.currency || 'INR';

  let balanceAvailable: number | null = null;
  let billableHours = totalHours;

  if (hasBucket && bucket !== undefined) {
    balanceAvailable = Math.max(0, bucket - allTimeHours);
    const priorHours = allTimeHours - totalHours;
    const bucketLeftForThisPeriod = Math.max(0, bucket - priorHours);
    billableHours = Math.max(0, totalHours - bucketLeftForThisPeriod);
  }

  const billableDays = billableHours / 8;
  const amount = billableHours * ratePerHour;

  return {
    totalHours,
    allTimeHours,
    hasBucket,
    hasRate,
    bucketHours: bucket || 0,
    balanceAvailable,
    billableHours,
    billableDays,
    ratePerDay,
    ratePerHour,
    amount,
    currency,
  };
}
