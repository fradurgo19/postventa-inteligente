'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/top-bar';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ModuleRouteGuard } from '@/components/layout/module-route-guard';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function AppShell({ children, breadcrumbs, className }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen bg-background">
      <ModuleRouteGuard />
      <TopBar onMenuToggle={handleSidebarToggle} sidebarOpen={sidebarOpen} />

      <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

      <main
        className={cn(
          'flex flex-col min-h-screen pt-16',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'pl-60' : 'pl-0',
          className
        )}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex-shrink-0 px-6 py-2.5 bg-muted/40 border-b border-border">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
