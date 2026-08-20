'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  clientName?: string;
  subItemName?: string;
}

export function Breadcrumbs({ clientName, subItemName }: BreadcrumbsProps) {
  const pathname = usePathname();

  const getSectionTitle = () => {
    if (pathname.startsWith('/integrations')) return { label: 'Integrations', href: '/integrations' };
    if (pathname.startsWith('/implementation')) return { label: 'Implementation', href: '/implementation' };
    if (pathname.startsWith('/ams')) return { label: 'AMS & Support', href: '/ams' };
    if (pathname.startsWith('/admin')) return { label: 'Admin & Governance', href: '/admin' };
    return null;
  };

  const section = getSectionTitle();

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Link
        href="/"
        className="flex items-center gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Dashboard</span>
      </Link>

      {section && (
        <>
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          <Link
            href={section.href}
            className={`hover:text-slate-900 dark:hover:text-slate-200 ${
              !clientName ? 'font-semibold text-[#0e7490]' : ''
            }`}
          >
            {section.label}
          </Link>
        </>
      )}

      {clientName && (
        <>
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          <span className={`truncate max-w-[180px] ${!subItemName ? 'font-semibold text-slate-900 dark:text-slate-100' : ''}`}>
            {clientName}
          </span>
        </>
      )}

      {subItemName && (
        <>
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          <span className="truncate max-w-[200px] font-semibold text-slate-900 dark:text-slate-100">
            {subItemName}
          </span>
        </>
      )}
    </nav>
  );
}
