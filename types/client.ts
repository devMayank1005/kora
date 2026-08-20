export type IntegrationStatus =
  | 'Not Started'
  | 'In Progress'
  | 'At Risk'
  | 'Completed'
  | 'On Hold — Internal'
  | 'On Hold — Client';

export interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  status: 'Pending' | 'Completed' | 'Delayed';
  completedDate?: string;
  notes?: string;
}

export interface TimelineUpdate {
  date: string;
  text: string;
  author?: string;
}

export interface Integration {
  id: string;
  name: string;
  status: IntegrationStatus;
  assignee: string;
  dueDate: string;
  description?: string;
  effort?: string;
  milestones?: Milestone[];
  timeline?: TimelineUpdate[];
  dependencies?: string;
  lastUpdate?: string;
}

export type PhaseStatus =
  | 'Not Started'
  | 'In Progress'
  | 'At Risk'
  | 'Completed'
  | 'On Hold';

export interface Attachment {
  id: string;
  name: string;
  path: string;
  url?: string;
  sizeBytes?: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface PhaseUpdate {
  date: string;
  text: string;
  author: string;
  status?: PhaseStatus;
  attachments?: Attachment[];
}

export interface Phase {
  id?: string;
  name: string;
  status: PhaseStatus;
  assignee: string;
  targetDate: string;
  completedDate?: string;
  signOffBy?: string;
  signOffDate?: string;
  signOffRole?: string;
  notes?: string;
  updates?: PhaseUpdate[];
  attachments?: Attachment[];
}

export interface ImplementationModule {
  id: string;
  name: string;
  lead?: string;
  phases: Phase[];
}

export type AmsQueryLevel = 'L1 - Inquiry' | 'L2 - Standard' | 'L3 - High' | 'L4 - Critical';
export type AmsEntryStatus = 'Open' | 'In Progress' | 'Under Review' | 'Resolved' | 'Closed';

export interface AmsEditHistory {
  timestamp: string;
  user: string;
  changes: Record<string, { from: any; to: any }>;
}

export interface WorkLogEntry {
  id: string;
  description: string;
  dateRaised: string;
  dueDate?: string;
  queryLevel: AmsQueryLevel;
  entryStatus: AmsEntryStatus;
  raisedBy?: string;
  assignedTo?: string;
  module?: string;
  project?: string;
  mode?: string;
  hours: number;
  solutionDiscussed?: string;
  dependencies?: string;
  edits?: AmsEditHistory[];
}

export interface Client {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  integrations: Integration[];
  modules?: ImplementationModule[];
  workLog?: WorkLogEntry[];
  manDayRate?: number;
  totalAvailableHours?: number;
  currency?: string;
  masterAssignee?: string;
  _v?: string; // Optimistic Concurrency Control timestamp / version
}
