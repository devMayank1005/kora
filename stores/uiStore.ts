import { create } from 'zustand';
import { ModalState, ThemeMode, UserRole } from '@/types';

interface UIStoreState {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  commandPaletteOpen: boolean;
  activeModal: ModalState | null;
  previewRole: UserRole | null;
  toast: {
    message: string;
    type: 'info' | 'success' | 'error' | 'warn';
    id: number;
  } | null;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  setPreviewRole: (role: UserRole | null) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error' | 'warn') => void;
  dismissToast: () => void;
}

export const useUIStore = create<UIStoreState>((set, get) => ({
  sidebarCollapsed: false,
  theme: 'light',
  commandPaletteOpen: false,
  activeModal: null,
  previewRole: null,
  toast: null,

  toggleSidebar: () => set(state => {
    const next = !state.sidebarCollapsed;
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('itk_sb_collapsed', next ? '1' : '0'); } catch (e) {}
    }
    return { sidebarCollapsed: next };
  }),

  setSidebarCollapsed: (collapsed: boolean) => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('itk_sb_collapsed', collapsed ? '1' : '0'); } catch (e) {}
    }
    set({ sidebarCollapsed: collapsed });
  },

  setTheme: (theme: ThemeMode) => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('itk_dark', theme === 'dark' ? '1' : '0'); } catch (e) {}
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },

  setCommandPaletteOpen: (open: boolean) => set({ commandPaletteOpen: open }),

  openModal: (modal: ModalState) => set({ activeModal: modal }),

  closeModal: () => set({ activeModal: null }),

  setPreviewRole: (role: UserRole | null) => set({ previewRole: role }),

  showToast: (message: string, type = 'info') => {
    const id = Date.now();
    set({ toast: { message, type, id } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 4000);
  },

  dismissToast: () => set({ toast: null }),
}));
