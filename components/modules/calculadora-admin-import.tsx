'use client';

import { toast } from 'sonner';
import { ExcelImportPanel } from '@/components/modules/excel-import-panel';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useTemparioImport } from '@/hooks/use-calculadora';

const TEMPARIO_COLUMNS = [
  'Marca',
  'Linea',
  'Modelo',
  'Tipo de item',
  'Item',
  'Unidad de medida',
  'Cantidad',
  'Frecuencia (horas)',
  'Aceite Homologado',
  'Referencia Genuina',
  'REF SAP DISPEL',
  'REF SAP ORIGINAL',
  'Referencia Stal',
  'Referencia Fleetguard',
  'Referencia Donalson',
  'Tiempo (horas)',
  'Procedimiento',
  'Avisos Claves',
];

export function CalculadoraAdminImport() {
  const importMutation = useTemparioImport();

  return (
    <div className="mt-6 border-t border-border pt-6">
      <ExcelImportPanel
        title="Importar Temparios de Mantenimiento"
        description="Solo administradores. Cargue CSV UTF-8 con la estructura de temparios."
        expectedColumns={TEMPARIO_COLUMNS}
        modulo="calculadora"
        onImport={async (result) => {
          if (!isSupabaseConfigured()) {
            await importMutation.mutateAsync({
              fileName: result.fileName,
              ok: result.recordsOk,
              error: result.recordsError,
            });
          }
          toast.success(
            `Importación: ${result.recordsOk} OK, ${result.recordsError} errores`
          );
        }}
      />
    </div>
  );
}
