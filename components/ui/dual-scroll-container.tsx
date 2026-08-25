'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from 'react';
import { cn } from '@/lib/utils';

interface DualScrollContainerProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly topScrollClassName?: string;
  readonly contentClassName?: string;
}

export function DualScrollContainer({
  children,
  className,
  topScrollClassName,
  contentClassName,
}: DualScrollContainerProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [showTopScroll, setShowTopScroll] = useState(false);

  const measureContent = useCallback(() => {
    const bottom = bottomRef.current;
    const table = bottom?.querySelector('table');
    if (!bottom || !table) return;

    const scrollWidth = Math.max(table.scrollWidth, bottom.scrollWidth);
    setContentWidth(scrollWidth);
    setShowTopScroll(scrollWidth > bottom.clientWidth + 1);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(measureContent);

    const bottom = bottomRef.current;
    if (!bottom) {
      return () => cancelAnimationFrame(raf);
    }

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(measureContent);
    });
    observer.observe(bottom);
    const table = bottom.querySelector('table');
    if (table) observer.observe(table);

    window.addEventListener('resize', measureContent);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', measureContent);
    };
  }, [children, measureContent]);

  const handleTopScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const bottom = bottomRef.current;
    if (!bottom || syncingRef.current) return;
    syncingRef.current = true;
    bottom.scrollLeft = event.currentTarget.scrollLeft;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  const handleBottomScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const top = topRef.current;
    if (!top || syncingRef.current) return;
    syncingRef.current = true;
    top.scrollLeft = event.currentTarget.scrollLeft;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  return (
    <div className={cn('space-y-0', className)}>
      {showTopScroll ? (
        <div
          ref={topRef}
          onScroll={handleTopScroll}
          className={cn(
            'overflow-x-auto overflow-y-hidden min-h-[10px] h-[10px] border-b border-border bg-muted/30 scrollbar-thin',
            topScrollClassName
          )}
          aria-label="Desplazamiento horizontal superior de la tabla"
        >
          <div className="h-full" style={{ width: contentWidth }} aria-hidden="true" />
        </div>
      ) : null}
      <div
        ref={bottomRef}
        onScroll={handleBottomScroll}
        className={cn('overflow-x-auto scrollbar-thin', contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
