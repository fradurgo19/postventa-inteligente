'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChangeType = 'up' | 'down' | 'neutral';
type Variant = 'default' | 'success' | 'warning' | 'danger';

interface KPICardProps {
  title: string;
  value: number | string;
  change?: number;
  changeType?: ChangeType;
  icon: React.ElementType;
  variant?: Variant;
  description?: string;
  className?: string;
}

const variantStyles: Record<Variant, { card: string; icon: string; iconBg: string }> = {
  default: {
    card: 'border-border',
    icon: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  success: {
    card: 'border-emerald-200',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  warning: {
    card: 'border-amber-200',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
  danger: {
    card: 'border-red-200',
    icon: 'text-red-600',
    iconBg: 'bg-red-50',
  },
};

const changeColors: Record<ChangeType, string> = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  neutral: 'text-muted-foreground',
};

const ChangeIcon: Record<ChangeType, React.ElementType> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

/** Animated numeric counter */
function AnimatedNumber({ value }: { value: number | string }) {
  const isNumeric = typeof value === 'number';
  const [display, setDisplay] = useState(isNumeric ? 0 : value);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!isNumeric) {
      setDisplay(value);
      return;
    }

    const target = value as number;
    const duration = 900; // ms
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, isNumeric]);

  return <span>{typeof display === 'number' ? display.toLocaleString() : display}</span>;
}

export function KPICard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  variant = 'default',
  description,
  className,
}: KPICardProps) {
  const styles = variantStyles[variant];
  const TrendIcon = ChangeIcon[changeType];
  const trendColor = changeColors[changeType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'bg-white rounded-xl border p-5 shadow-sm',
        'hover:shadow-md transition-shadow duration-300',
        styles.card,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div className={cn('rounded-lg p-2.5 flex-shrink-0', styles.iconBg)}>
          <Icon className={cn('h-5 w-5', styles.icon)} />
        </div>

        {/* Change badge */}
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-semibold', trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <p className="text-3xl font-bold text-foreground tracking-tight leading-none">
          <AnimatedNumber value={value} />
        </p>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
