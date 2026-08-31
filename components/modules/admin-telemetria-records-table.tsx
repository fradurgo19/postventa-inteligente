'use client';

import { useMemo, useState } from 'react';
import { Pencil, Trash2, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAdminTelemetriaPage,
  useDeleteAdminTelemetria,
  useUpdateAdminTelemetria,
} from '@/hooks/use-administration';
import type { AdminTelemetriaRow } from '@/services/administration.service';

interface AdminTelemetriaRecordsTableProps {
  readonly canManage: boolean;
  readonly batchId?: string | null;
  readonly onClearBatchFilter?: () => void;
}

export function AdminTelemetriaRecordsTable({
  canManage,
  batchId = null,
  onClearBatchFilter,
}: AdminTelemetriaRecordsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading, refetch } = useAdminTelemetriaPage({
    search,
    batchId,
    page,
    pageSize,
    enabled: canManage,
  });

  const updateMutation = useUpdateAdminTelemetria();
  const deleteMutation = useDeleteAdminTelemetria();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTelemetriaRow | null>(null);
  const [form, setForm] = useState({
    titulo: '',
    serie: '',
    marca: '',
    modelo: '',
    horometro: '0',
    sede: '',
    ciudad: '',
    asesor_email: '',
    estado: '',
    fecha_primer_mtto: '',
    mes_creado: '',
    anio: '',
    observaciones: '',
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows: AdminTelemetriaRow[] = data?.rows ?? [];

  const openEdit = (row: AdminTelemetriaRow) => {
    setEditing(row);
    setForm({
      titulo: row.titulo ?? '',
      serie: row.serie,
      marca: row.marca,
      modelo: row.modelo,
      horometro: String(row.horometro ?? 0),
      sede: row.sede ?? '',
      ciudad: row.ciudad ?? '',
      asesor_email: row.asesor_email ?? '',
      estado: row.estado ?? '',
      fecha_primer_mtto: row.fecha_primer_mtto?.slice(0, 10) ?? '',
      mes_creado: row.mes_creado ?? '',
      anio: row.anio != null ? String(row.anio) : '',
      observaciones: row.observaciones ?? '',
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!form.serie.trim() || !form.marca.trim() || !form.modelo.trim()) {
      toast.error('Serie, marca y modelo son obligatorios.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        input: {
          titulo: form.titulo,
          serie: form.serie,
          marca: form.marca,
          modelo: form.modelo,
          horometro: Number(form.horometro) || 0,
          sede: form.sede,
          ciudad: form.ciudad,
          asesor_email: form.asesor_email,
          estado: form.estado,
          fecha_primer_mtto: form.fecha_primer_mtto || null,
          mes_creado: form.mes_creado,
          anio: form.anio ? Number(form.anio) : null,
          observaciones: form.observaciones,
        },
      });
      toast.success('Registro de telemetría actualizado.');
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  };

  const remove = async (row: AdminTelemetriaRow) => {
    const ok = window.confirm(
      `¿Eliminar el registro de telemetría ${row.serie} (${row.marca} ${row.modelo})?`
    );
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(row.id);
      toast.success('Registro eliminado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  };

  const batchLabel = useMemo(() => {
    if (!batchId) return null;
    return batchId.slice(0, 8).toUpperCase();
  }, [batchId]);

  if (!canManage) {
    return (
      <p className="text-xs text-muted-foreground px-1 py-2">
        Solo el rol Administrador puede consultar y editar registros de telemetría.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Registros de telemetría (carga masiva)
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Edite o elimine filas individuales. Para quitar una carga completa use el historial.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {batchLabel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                onClearBatchFilter?.();
                setPage(1);
              }}
            >
              Lote {batchLabel} · Quitar filtro
            </Button>
          ) : null}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 w-48 pl-8 text-xs"
              placeholder="Buscar serie, marca…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => void refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                <th className="px-3 py-2.5 text-left">Cliente</th>
                <th className="px-3 py-2.5 text-left">Serie</th>
                <th className="px-3 py-2.5 text-left">Marca</th>
                <th className="px-3 py-2.5 text-left">Modelo</th>
                <th className="px-3 py-2.5 text-right">Horas</th>
                <th className="px-3 py-2.5 text-left">Sede</th>
                <th className="px-3 py-2.5 text-left">1er mtto</th>
                <th className="px-3 py-2.5 text-left">Periodo</th>
                <th className="px-3 py-2.5 text-left">Lote</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                    Sin registros de telemetría
                    {batchLabel ? ` para el lote ${batchLabel}` : ''}.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 max-w-[140px] truncate" title={row.titulo ?? ''}>
                      {row.titulo || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono">{row.serie}</td>
                    <td className="px-3 py-2">{row.marca}</td>
                    <td className="px-3 py-2">{row.modelo}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.horometro.toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-2">{row.sede || '—'}</td>
                    <td className="px-3 py-2">{row.fecha_primer_mtto || '—'}</td>
                    <td className="px-3 py-2">
                      {[row.mes_creado, row.anio].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {row.import_batch_id
                        ? row.import_batch_id.slice(0, 8).toUpperCase()
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(row)}
                          aria-label={`Editar ${row.serie}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => void remove(row)}
                          aria-label={`Eliminar ${row.serie}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0
            ? 'Sin resultados'
            : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-2">
            {page}/{totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar telemetría</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {(
              [
                ['titulo', 'Cliente'],
                ['serie', 'Serie'],
                ['marca', 'Marca'],
                ['modelo', 'Modelo'],
                ['horometro', 'Horómetro'],
                ['sede', 'Sede'],
                ['ciudad', 'Ciudad'],
                ['asesor_email', 'Asesor'],
                ['estado', 'Estado'],
                ['fecha_primer_mtto', 'Fecha 1er mtto'],
                ['mes_creado', 'Mes creado'],
                ['anio', 'Año'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  className="h-8 text-sm"
                  type={key === 'fecha_primer_mtto' ? 'date' : 'text'}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Observaciones</Label>
              <Input
                className="h-8 text-sm"
                value={form.observaciones}
                onChange={(e) =>
                  setForm((f) => ({ ...f, observaciones: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#cf1b22] hover:bg-[#b01820]"
              disabled={updateMutation.isPending}
              onClick={() => void save()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
