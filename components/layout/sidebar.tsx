'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calculator,
  Calendar,
  Package,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const navItems = [
  {
    label: 'Panel Principal',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Calculadora',
    href: '/calculator',
    icon: Calculator,
  },
  {
    label: 'Mantenimiento Proyectado',
    href: '/projected-maintenance',
    icon: Calendar,
  },
  {
    label: 'Repuestos CPP',
    href: '/cpp',
    icon: Package,
  },
  {
    label: 'Panel Ejecutivo',
    href: '/executive-dashboard',
    icon: BarChart3,
  },
  {
    label: 'Administración',
    href: '/administration',
    icon: Settings,
  },
];

export function Sidebar({ isOpen, onToggle, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-16 bottom-0 z-40 flex flex-col bg-white border-r border-border',
          'transition-all duration-300 ease-in-out',
          isOpen ? 'w-60' : 'w-16',
          className
        )}
      >
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin">
          <ul className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname?.startsWith(item.href));

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium',
                    'transition-all duration-150 ease-in-out',
                    'group relative overflow-hidden',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    !isOpen && 'justify-center px-2.5'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                      style={{ backgroundColor: '#cf1b22' }}
                      aria-hidden="true"
                    />
                  )}

                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors duration-150',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />

                  {isOpen && (
                    <span className="truncate transition-opacity duration-200">
                      {item.label}
                    </span>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {!isOpen ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              'h-9 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150',
              isOpen ? 'justify-end pr-2' : 'justify-center'
            )}
            aria-label={isOpen ? 'Contraer barra lateral' : 'Expandir barra lateral'}
          >
            {isOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
