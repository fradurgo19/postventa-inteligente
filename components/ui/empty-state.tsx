import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {/* SVG illustration backdrop */}
      <div className="relative mb-6 select-none" aria-hidden="true">
        {/* Concentric rings */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-60"
        >
          <circle cx="60" cy="60" r="55" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="60" cy="60" r="38" fill="hsl(var(--muted))" />
          <circle cx="60" cy="60" r="55" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
        </svg>

        {/* Icon centered over illustration */}
        {Icon && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-background border border-border shadow-sm p-3">
              <Icon className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {/* Action */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="gap-2"
          style={{ backgroundColor: '#cf1b22', color: '#fff' }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
