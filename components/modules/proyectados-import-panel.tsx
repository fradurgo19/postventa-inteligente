'use client';

import { toast } from 'sonner';
import { ExcelImportPanel } from '@/components/modules/excel-import-panel';
import { useTelemetriaImport } from '@/hooks/use-projected-maintenance';

const TELEMETRIA_COLUMNS = [
  'Título',
  'email',
  'Nit',
  'Telefono',
  'Serie',
  'Modelo',
  'Horometro',
  'Promedio_h',
  'Ciudad',
  'Latitud',
  'Longitud',
  'Fecha Primer Mtto',
  'Sede',
  'Asesor',
  'Marca',
  'Tipo Mtto',
  'Estado',
  'TipoDeMaquina',
];

export function ProyectadosImportPanel() {
  const importMutation = useTelemetriaImport();

  return (
    <ExcelImportPanel
      title="Importar Telemetría Mensual"
      description="Coordinadores y administradores. CSV UTF-8 con la estructura de telemetría por fabricante."
      expectedColumns={TELEMETRIA_COLUMNS}
      modulo="proyectados"
      onImport={async (result) => {
        toast.success(
          `Telemetría: ${result.recordsOk} registros, ${result.recordsError} errores`
        );
      }}
    />
  );
}
