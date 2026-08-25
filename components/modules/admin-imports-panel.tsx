'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ProyectadosImportPanel } from '@/components/modules/proyectados-import-panel';
import { AdminDomainImportTables } from '@/components/modules/admin-domain-import-tables';
import { useAdminImportaciones } from '@/hooks/use-administration';
import type { AdminImportRow } from '@/services/administration.service';
import { useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/store';

const IMPORT_TYPES = [
  'Cronograma / Telemetría',
  'Asesores',
  'Equipos',
  'Clientes',
] as const;

type ImportTypeOption = (typeof IMPORT_TYPES)[number];

function ImportStatusBadge({ status }: Readonly<{ status: string }>) {
  const map: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const labels: Record<string, string> = {
    success: 'Exitoso',
    error: 'Error',
    warning: 'Parcial',
    processing: 'Procesando',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        map[status] ?? 'bg-gray-100 text-gray-600'
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function AdminImportsPanel() {
  const { role } = useUserStore();
  const isAdmin = role === 'Administrator';
  const [importType, setImportType] = useState<ImportTypeOption>(IMPORT_TYPES[0]);
  const queryClient = useQueryClient();
  const { data: importaciones = [] as AdminImportRow[], isLoading: loadingImports, refetch } =
    useAdminImportaciones();

  const invalidateDomain = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin'] });
    await queryClient.invalidateQueries({ queryKey: ['proyectados'] });
    await refetch();
  };

  const domainKind =
    importType === 'Asesores' || importType === 'Equipos' || importType === 'Clientes'
      ? importType
      : null;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-border shadow-sm p-5"
      >
        <h2 className="text-sm font-semibold text-foreground mb-2">Importar Datos</h2>
        <p className="text-xs text-muted-foreground mb-4">
          El Excel de telemetría alimenta <strong>asesores</strong>, <strong>clientes</strong>,{' '}
          <strong>equipos</strong> y el <strong>cronograma</strong> (
          <code className="text-[11px]">telemetria_equipos</code>). Los maestros también se
          gestionan en las pestañas inferiores.
        </p>

        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Tipo de importación
          </p>
          <div className="flex flex-wrap gap-2">
            {IMPORT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setImportType(type)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  importType === type
                    ? 'bg-[#cf1b22] text-white border-[#cf1b22] shadow-sm'
                    : 'bg-white text-muted-foreground border-border hover:border-[#cf1b22]/50 hover:text-foreground'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {importType === 'Cronograma / Telemetría' ? (
          <div>
            <ProyectadosImportPanel />
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => void invalidateDomain()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refrescar relaciones
              </Button>
            </div>
          </div>
        ) : null}

        {domainKind ? (
          <AdminDomainImportTables kind={domainKind} canManage={isAdmin} />
        ) : null}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-border shadow-sm"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Historial de Importaciones</h2>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Actualizar
          </Button>
        </div>
        <div className="overflow-x-auto">
          {loadingImports ? (
            <div className="p-5">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                  <th className="px-5 py-3 text-left">ID</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left">Archivo</th>
                  <th className="px-5 py-3 text-right">Filas OK</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {importaciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                      Sin importaciones registradas en Supabase.
                    </td>
                  </tr>
                ) : (
                  importaciones.map((imp: AdminImportRow) => (
                    <tr key={imp.id + imp.date} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-5 py-3 font-mono text-muted-foreground">{imp.id}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{imp.typeLabel}</td>
                      <td className="px-5 py-3 text-muted-foreground">{imp.file}</td>
                      <td className="px-5 py-3 text-right font-medium">
                        {imp.rows.toLocaleString('es-CO')}
                      </td>
                      <td className="px-5 py-3">
                        <ImportStatusBadge status={imp.status} />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{imp.date}</td>
                      <td className="px-5 py-3 text-muted-foreground">{imp.user}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
