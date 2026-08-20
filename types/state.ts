import { Client, Integration, ImplementationModule, WorkLogEntry } from './client';
import { User } from './user';

export type ModalType =
  | 'add-client'
  | 'edit-client'
  | 'delete-client'
  | 'add-integ'
  | 'edit-integ'
  | 'delete-integ'
  | 'bulk-delete-integ'
  | 'add-milestone'
  | 'edit-milestone'
  | 'add-timeline'
  | 'add-module'
  | 'edit-module'
  | 'delete-module'
  | 'edit-phase'
  | 'signoff-phase'
  | 'upload-phase-doc'
  | 'add-phase-note'
  | 'add-ams-entry'
  | 'edit-ams-entry'
  | 'delete-ams-entry'
  | 'bulk-delete-ams'
  | 'add-user'
  | 'edit-user'
  | 'delete-user'
  | 'reset-password'
  | 'export-menu'
  | 'task-runner'
  | 'custom-report';

export interface ModalState {
  type: ModalType;
  clientId?: string;
  integId?: string;
  moduleId?: string;
  phaseName?: string;
  entryId?: string;
  userId?: string;
  data?: any;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UIState {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  commandPaletteOpen: boolean;
  activeModal: ModalState | null;
  previewRole: 'admin' | 'editor' | 'viewer' | null;
  toast: {
    message: string;
    type: 'info' | 'success' | 'error' | 'warn';
    id: number;
  } | null;
}
