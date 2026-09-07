'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
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

function readScrollMetrics(bottom: HTMLDivElement): { scrollWidth: number; needsScroll: boolean } {
  const table = bottom.querySelector('table');
  const content = table ?? bottom.firstElementChild;
  const scrollWidth = Math.max(
    content?.scrollWidth ?? 0,
    table?.offsetWidth ?? 0,
    bottom.scrollWidth
  );
  return {
    scrollWidth,
    needsScroll: scrollWidth > bottom.clientWidth + 1,
  };
}

/**
 * Contenedor con barra de scroll horizontal superior e inferior sincronizadas.
 * Requiere ancho limitado por el padre (w-full / min-w-0).
 */
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
    if (!bottom) return;

    const { scrollWidth, needsScroll } = readScrollMetrics(bottom);
    setContentWidth(scrollWidth);
    setShowTopScroll(needsScroll);

    const top = topRef.current;
    if (top && !syncingRef.current) {
      top.scrollLeft = bottom.scrollLeft;
    }
  }, []);

  useLayoutEffect(() => {
    measureContent();
  }, [children, measureContent]);

  useEffect(() => {
    const bottom = bottomRef.current;
    if (!bottom) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(measureContent);
    });
    observer.observe(bottom);
    const table = bottom.querySelector('table');
    if (table) observer.observe(table);

    const mutation = new MutationObserver(() => {
      requestAnimationFrame(measureContent);
    });
    mutation.observe(bottom, { childList: true, subtree: true, characterData: true });

    window.addEventListener('resize', measureContent);

    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', measureContent);
    };
  }, [measureContent]);

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
    <div className={cn('w-full max-w-full min-w-0', className)}>
      {showTopScroll ? (
        <div
          ref={topRef}
          onScroll={handleTopScroll}
          className={cn(
            'w-full max-w-full overflow-x-auto overflow-y-hidden h-3 border-b border-border bg-muted/40 scrollbar-thin',
            topScrollClassName
          )}
          aria-label="Desplazamiento horizontal superior de la tabla"
        >
          <div style={{ width: contentWidth, height: 1 }} aria-hidden="true" />
        </div>
      ) : null}
      <div
        ref={bottomRef}
        onScroll={handleBottomScroll}
        className={cn('w-full max-w-full min-w-0 overflow-x-auto scrollbar-thin', contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
