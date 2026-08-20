'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Eye, X } from 'lucide-react';

export function RolePreviewBanner() {
  const { previewRole, setPreviewRole } = useUIStore();

  if (!previewRole) return null;

  return (
    <div className="flex h-8 items-center justify-between bg-amber-500 px-4 text-xs font-medium text-slate-950 shadow-xs">
      <div className="flex items-center gap-2">
        <Eye className="h-3.5 w-3.5" />
        <span>
          Previewing workspace as <strong className="uppercase">{previewRole}</strong> — UI elements restricted accordingly.
        </span>
      </div>
      <button
        onClick={() => setPreviewRole(null)}
        className="flex items-center gap-1 rounded px-2 py-0.5 font-semibold text-slate-950 hover:bg-amber-600/30"
      >
        <span>Exit Preview</span>
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
