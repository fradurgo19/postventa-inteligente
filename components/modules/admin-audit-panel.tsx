'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditoria } from '@/hooks/use-administration';
import type { AdminAuditRow } from '@/services/administration.service';
import { cn } from '@/lib/utils';

function LevelBadge({ level }: Readonly<{ level: AdminAuditRow['level'] }>) {
  const map = {
    INFO: { cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Info, label: 'INFO' },
    WARN: {
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      Icon: AlertTriangle,
      label: 'ADVERTENCIA',
    },
    ERROR: { cls: 'bg-red-50 text-red-700 border-red-200', Icon: AlertCircle, label: 'ERROR' },
  } as const;
  const { cls, Icon, label } = map[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        cls
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function actionBadgeClass(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('delete') || lower.includes('elimin')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (lower.includes('create') || lower.includes('cread')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function ActionBadge({ action }: Readonly<{ action: string }>) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        actionBadgeClass(action)
      )}
    >
      {action}
    </span>
  );
}

interface AdminAuditPanelProps {
  readonly mode: 'logs' | 'audit';
}

export function AdminAuditPanel({ mode }: AdminAuditPanelProps) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | AdminAuditRow['level']>('ALL');

  const query = useMemo(
    () => ({
      from: dateFrom || undefined,
      to: dateTo || undefined,
      search: search || undefined,
      limit: mode === 'logs' ? 80 : 150,
    }),
    [dateFrom, dateTo, search, mode]
  );

  const { data, isLoading, refetch } = useAuditoria(query);
  const rows: AdminAuditRow[] = (data ?? []).filter(
    (r: AdminAuditRow) => levelFilter === 'ALL' || r.level === levelFilter
  );

  const exportCsv = () => {
    const header = ['Fecha', 'Usuario', 'Nivel', 'Acción', 'Módulo', 'Registro', 'Detalle', 'IP'];
    const lines = rows.map((r) =>
      [r.timestamp, r.user, r.level, r.action, r.module, r.record, r.fields, r.ip]
        .map((c) => `"${String(c).replaceAll('"', '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'logs' ? 'registros_actividad.csv' : 'auditoria.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-border shadow-sm"
    >
      <div className="px-5 py-4 border-b border-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {mode === 'logs' ? 'Registros de actividad' : 'Auditoría'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Fuente: tabla <code className="text-[11px]">auditoria</code> (importaciones, usuarios,
              configuración).
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Actualizar
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Desde</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Hasta</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          {mode === 'logs' ? (
            <div className="flex gap-1">
              {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lv) => (
                <Button
                  key={lv}
                  type="button"
                  size="sm"
                  variant={levelFilter === lv ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs',
                    levelFilter === lv && 'bg-[#cf1b22] hover:bg-[#a81419]'
                  )}
                  onClick={() => setLevelFilter(lv)}
                >
                  {lv === 'ALL' ? 'Todos' : lv}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-5">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                <th className="px-5 py-3 text-left">Fecha</th>
                {mode === 'logs' ? <th className="px-5 py-3 text-left">Nivel</th> : null}
                <th className="px-5 py-3 text-left">Usuario</th>
                <th className="px-5 py-3 text-left">Acción</th>
                <th className="px-5 py-3 text-left">Módulo</th>
                <th className="px-5 py-3 text-left">Registro</th>
                <th className="px-5 py-3 text-left">Detalle</th>
                <th className="px-5 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={mode === 'logs' ? 8 : 7}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    Sin eventos. Ejecute SQL 20 y realice acciones en Administración / Importaciones.
                  </td>
                </tr>
              ) : (
                rows.map((entry: AdminAuditRow) => (
                  <tr key={entry.id + entry.timestamp} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-5 py-2.5 whitespace-nowrap">{entry.timestamp}</td>
                    {mode === 'logs' ? (
                      <td className="px-5 py-2.5">
                        <LevelBadge level={entry.level} />
                      </td>
                    ) : null}
                    <td className="px-5 py-2.5">{entry.user}</td>
                    <td className="px-5 py-2.5">
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="px-5 py-2.5">{entry.module}</td>
                    <td className="px-5 py-2.5 font-mono">{entry.record}</td>
                    <td className="px-5 py-2.5 max-w-[220px] truncate" title={entry.fields}>
                      {entry.fields}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{entry.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
