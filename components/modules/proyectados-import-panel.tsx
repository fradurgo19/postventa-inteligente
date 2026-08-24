'use client';

import { toast } from 'sonner';
import { ExcelImportPanel } from '@/components/modules/excel-import-panel';
import { useQueryClient } from '@tanstack/react-query';
import {
  TELEMETRIA_EXCEL_COLUMNS,
  downloadTelemetriaExcelTemplate,
} from '@/lib/proyectados/telemetria-import';

export function ProyectadosImportPanel() {
  const queryClient = useQueryClient();

  return (
    <ExcelImportPanel
      title="Importar Telemetría Mensual"
      description="Carga masiva mensual: identifica clientes, asesores, sedes y máquinas (únicos) y guarda proyecciones de telemetría por serie + mes + año (historial de próximos mtto, sin tratar meses distintos como duplicados)."
      expectedColumns={TELEMETRIA_EXCEL_COLUMNS}
      modulo="proyectados"
      onDownloadTemplate={downloadTelemetriaExcelTemplate}
      templateButtonLabel="Descargar plantilla TELEMETRÍA"
      onImport={async (result) => {
        await queryClient.invalidateQueries({ queryKey: ['proyectados'] });
        await queryClient.invalidateQueries({ queryKey: ['admin'] });

        if (result.recordsOk > 0) {
          toast.success('Telemetría cargada', {
            description:
              `${result.recordsOk} OK` +
              (result.duplicates
                ? ` · ${result.duplicates} actualizados (mismo mes/año por serie)`
                : '') +
              (result.recordsError ? ` · ${result.recordsError} con error` : ''),
            duration: 12_000,
          });
        } else {
          toast.error('No se importaron registros', {
            description: result.errors?.[0]?.message ?? `${result.recordsError} errores`,
            duration: 12_000,
          });
        }
      }}
    />
  );
}
