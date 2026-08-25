'use client';

import { Filter, FilterX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_REPORT_FILTERS,
  REPORT_MESES,
  type ReportFiltersState,
} from '@/lib/report-filters';

export interface ReportFilterOptions {
  marcas: string[];
  modelos: string[];
  periodos: string[];
  clientes: string[];
}

interface ReportFiltersBarProps {
  readonly value: ReportFiltersState;
  readonly onChange: (next: ReportFiltersState) => void;
  readonly options: ReportFilterOptions;
  readonly className?: string;
}

function hasActiveFilters(value: ReportFiltersState): boolean {
  return (
    value.marca !== DEFAULT_REPORT_FILTERS.marca ||
    value.modelo !== DEFAULT_REPORT_FILTERS.modelo ||
    value.periodo !== DEFAULT_REPORT_FILTERS.periodo ||
    value.cliente !== DEFAULT_REPORT_FILTERS.cliente ||
    value.mes !== DEFAULT_REPORT_FILTERS.mes
  );
}

export function ReportFiltersBar({
  value,
  onChange,
  options,
  className,
}: ReportFiltersBarProps) {
  const update = (patch: Partial<ReportFiltersState>) => {
    onChange({ ...value, ...patch });
  };

  const clearFilters = () => {
    onChange({ ...DEFAULT_REPORT_FILTERS });
  };

  const filtersActive = hasActiveFilters(value);

  return (
    <Card className={className ?? 'border-border'}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#cf1b22]" />
            <span className="text-sm font-semibold">Filtros del informe</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={clearFilters}
            disabled={!filtersActive}
            aria-label="Retirar filtros"
          >
            <FilterX className="h-3.5 w-3.5" />
            Retirar filtros
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Select
            value={value.marca}
            onValueChange={(v) => update({ marca: v, modelo: 'all' })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las marcas</SelectItem>
              {options.marcas
                .filter((m) => m.trim().length > 0)
                .map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={value.modelo} onValueChange={(v) => update({ modelo: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los modelos</SelectItem>
              {options.modelos
                .filter((m) => m.trim().length > 0)
                .map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={value.periodo} onValueChange={(v) => update({ periodo: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los periodos</SelectItem>
              {options.periodos
                .filter((y) => y.trim().length > 0)
                .map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={value.cliente} onValueChange={(v) => update({ cliente: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {options.clientes
                .filter((c) => c.trim().length > 0)
                .map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={value.mes} onValueChange={(v) => update({ mes: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {REPORT_MESES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_REPORT_FILTERS };
