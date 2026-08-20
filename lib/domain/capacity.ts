import { Client, Integration } from '@/types/client';

export interface AssigneeCapacity {
  assignee: string;
  totalIntegrations: number;
  inProgress: number;
  atRisk: number;
  completed: number;
  totalEffortScore: number;
  clients: string[];
}

const EFFORT_WEIGHTS: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  'Very High': 5,
};

export function calculateAssigneeCapacity(clients: Client[]): AssigneeCapacity[] {
  const map: Record<string, AssigneeCapacity> = {};

  clients.forEach(c => {
    (c.integrations || []).forEach(i => {
      const assignee = i.assignee?.trim() || 'Unassigned';
      if (!map[assignee]) {
        map[assignee] = {
          assignee,
          totalIntegrations: 0,
          inProgress: 0,
          atRisk: 0,
          completed: 0,
          totalEffortScore: 0,
          clients: [],
        };
      }

      const rec = map[assignee];
      rec.totalIntegrations++;
      if (!rec.clients.includes(c.name)) rec.clients.push(c.name);

      if (i.status === 'In Progress') rec.inProgress++;
      else if (i.status === 'At Risk') rec.atRisk++;
      else if (i.status === 'Completed') rec.completed++;

      const effortWeight = EFFORT_WEIGHTS[i.effort || 'Medium'] || 2;
      if (i.status !== 'Completed') {
        rec.totalEffortScore += effortWeight;
      }
    });
  });

  return Object.values(map).sort((a, b) => b.totalEffortScore - a.totalEffortScore);
}
