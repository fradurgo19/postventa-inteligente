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
      description="Carga masiva mensual (~5.000 filas): plantilla desde Nombre del cliente → upsert por lotes en clientes, asesores, sedes, máquinas y telemetría (por serie), sin saturar la red."
      expectedColumns={TELEMETRIA_EXCEL_COLUMNS}
      modulo="proyectados"
      onDownloadTemplate={downloadTelemetriaExcelTemplate}
      templateButtonLabel="Descargar plantilla TELEMETRÍA"
      onImport={async (result) => {
        await queryClient.invalidateQueries({ queryKey: ['proyectados'] });

        if (result.recordsOk > 0) {
          toast.success('Telemetría cargada', {
            description:
              `${result.recordsOk} OK` +
              (result.duplicates ? ` · ${result.duplicates} actualizados por serie` : '') +
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
