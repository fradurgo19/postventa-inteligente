'use client';

import { toast } from 'sonner';
import { ExcelImportPanel } from '@/components/modules/excel-import-panel';

const CPP_COLUMNS = [
  'No',
  'RefSAP',
  'Marca',
  'Nombre',
  'Cantidad',
  'Frecuencia',
  'Medida',
  'Comentario',
  'Modelo',
  'Parte',
  'Tipo',
  'ImagenUrl',
  'Recomendación',
  'Adjuntos',
  'EQUIVALENCIA1',
  'EQUIVALENCIA2',
  'EQUIVALENCIA3',
  'REFERENCIACATALOGOORIGINAL',
];

export function CppAdminImportPanel() {
  return (
    <ExcelImportPanel
      title="Importar / Actualizar Catálogo CPP"
      description="Coordinadores y administradores. CSV UTF-8 con la estructura del catálogo de partes."
      expectedColumns={CPP_COLUMNS}
      modulo="cpp"
      onImport={async (result) => {
        toast.success(`Catálogo CPP: ${result.recordsOk} registros procesados`);
      }}
    />
  );
}
