'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAdminAsesorOptions,
  useAdminClienteOptions,
  useAdminEquipoRelacionesPage,
  useUpdateAdminEquipoRelacion,
} from '@/hooks/use-administration';
import type { AdminEquipoRelacionRow } from '@/services/administration.service';

interface AdminEquipoRelacionesTableProps {
  readonly canManage: boolean;
}

export function AdminEquipoRelacionesTable({ canManage }: AdminEquipoRelacionesTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [savingSerie, setSavingSerie] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminEquipoRelacionesPage({
    search,
    page,
    pageSize,
  });
  const { data: clientes = [] } = useAdminClienteOptions();
  const { data: asesores = [] } = useAdminAsesorOptions();
  const updateMutation = useUpdateAdminEquipoRelacion();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const clienteOptions = useMemo(
    () => [{ id: 'none', label: 'Sin cliente', sublabel: null }, ...clientes],
    [clientes]
  );
  const asesorOptions = useMemo(
    () => [{ id: 'none', label: 'Sin asesor', sublabel: null }, ...asesores],
    [asesores]
  );

  const handleClienteChange = async (row: AdminEquipoRelacionRow, value: string) => {
    if (!canManage) return;
    const clienteId = value === 'none' ? null : value;
    if (clienteId === row.cliente_id) return;

    setSavingSerie(row.serie);
    try {
      const result = await updateMutation.mutateAsync({
        maquinaId: row.id,
        serie: row.serie,
        clienteId,
      });
      toast.success(
        `Cliente actualizado · ${result.telemetriaActualizados} registro(s) de telemetría sincronizados`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el cliente');
    } finally {
      setSavingSerie(null);
    }
  };

  const handleAsesorChange = async (row: AdminEquipoRelacionRow, value: string) => {
    if (!canManage) return;
    const asesorId = value === 'none' ? null : value;
    if (asesorId === row.asesor_id) return;

    setSavingSerie(row.serie);
    try {
      const result = await updateMutation.mutateAsync({
        maquinaId: row.id,
        serie: row.serie,
        asesorId,
      });
      toast.success(
        `Asesor actualizado · ${result.telemetriaActualizados} registro(s) de telemetría sincronizados`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el asesor');
    } finally {
      setSavingSerie(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-2xl">
          Vista unificada <strong>Equipo → Cliente → Asesor</strong>. Al cambiar cliente o asesor,
          se actualizan <code className="text-[11px]">maquinas</code> y todo el historial de{' '}
          <code className="text-[11px]">telemetria_equipos</code> de esa serie.
        </p>
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={() => void refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Actualizar
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por serie, marca o modelo…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground font-semibold border-b">
                <th className="px-3 py-2 text-left">Serie</th>
                <th className="px-3 py-2 text-left">Marca / Modelo</th>
                <th className="px-3 py-2 text-left min-w-[200px]">Cliente</th>
                <th className="px-3 py-2 text-left min-w-[200px]">Asesor</th>
                <th className="px-3 py-2 text-left">Sede</th>
                <th className="px-3 py-2 text-right">Telemetría</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    Sin equipos. Importe telemetría o agregue equipos en la pestaña Equipos.
                  </td>
                </tr>
              ) : (
                rows.map((row: AdminEquipoRelacionRow) => {
                  const busy = savingSerie === row.serie;
                  return (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{row.serie}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.marca}</div>
                        <div className="text-muted-foreground">{row.modelo}</div>
                      </td>
                      <td className="px-3 py-2">
                        {canManage ? (
                          <Select
                            value={row.cliente_id ?? 'none'}
                            disabled={busy}
                            onValueChange={(value) => void handleClienteChange(row, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              {clienteOptions.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                  {c.label}
                                  {c.sublabel ? ` · ${c.sublabel}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>{row.cliente_titulo ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {canManage ? (
                          <Select
                            value={row.asesor_id ?? 'none'}
                            disabled={busy}
                            onValueChange={(value) => void handleAsesorChange(row, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Seleccionar asesor" />
                            </SelectTrigger>
                            <SelectContent>
                              {asesorOptions.map((a) => (
                                <SelectItem key={a.id} value={a.id} className="text-xs">
                                  {a.label}
                                  {a.sublabel ? ` · ${a.sublabel}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>{row.asesor_nombre ?? row.asesor_email ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.sede ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.telemetria_registros.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total.toLocaleString('es-CO')} equipos · página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
