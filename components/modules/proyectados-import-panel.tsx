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
      description="Carga aditiva: la primera puede ser el histórico completo (~5k). Cada mes se agregan ~300 servicios nuevos sin borrar meses anteriores. Clientes, asesores y máquinas se actualizan si cambian en la carga."
      expectedColumns={TELEMETRIA_EXCEL_COLUMNS}
      modulo="proyectados"
      onDownloadTemplate={downloadTelemetriaExcelTemplate}
      templateButtonLabel="Descargar plantilla TELEMETRÍA"
      onImport={async (result) => {
        await queryClient.invalidateQueries({ queryKey: ['proyectados'] });
        await queryClient.invalidateQueries({ queryKey: ['admin'] });

        if (result.recordsOk > 0) {
          toast.success('Telemetría cargada (registros agregados)', {
            description:
              `${result.recordsOk} nuevos` +
              (result.recordsError ? ` · ${result.recordsError} con error` : '') +
              ' · El historial previo se conserva',
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
