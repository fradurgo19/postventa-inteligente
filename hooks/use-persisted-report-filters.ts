'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_REPORT_FILTERS,
  readStoredReportFilters,
  sanitizeReportFilters,
  writeStoredReportFilters,
  type ReportFiltersState,
} from '@/lib/report-filters';

/**
 * Filtros de informe persistidos en localStorage (sobreviven navegación y recarga).
 */
export function usePersistedReportFilters(storageKey: string) {
  const [filters, setFiltersState] = useState<ReportFiltersState>(
    () => ({ ...DEFAULT_REPORT_FILTERS })
  );

  useEffect(() => {
    setFiltersState(readStoredReportFilters(storageKey));
  }, [storageKey]);

  const setFilters = useCallback(
    (next: ReportFiltersState) => {
      const clean = sanitizeReportFilters(next);
      setFiltersState(clean);
      writeStoredReportFilters(storageKey, clean);
    },
    [storageKey]
  );

  return [filters, setFilters] as const;
}
