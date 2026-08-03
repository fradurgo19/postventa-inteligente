/**
 * Encabezados del Excel TEMPARIOS (orden real de importación).
 * La primera columna debe ser Marca.
 */
export const TEMPARIO_EXCEL_COLUMNS = [
  'Marca',
  'Linea',
  'Modelo',
  'Modelo2',
  'Item',
  'Cantidad',
  'Cantidad (Galones)',
  'Frecuencia',
  'Aceite Homologado',
  'Referencia Genuina',
  'REF SAP DISPEL',
  'REF SAP ORIGINAl',
  'Referencia Stal',
  'Referencia Fleetguard',
  'Referencia Donalson',
  'Tiempo',
  'Procedimiento',
  'Observaciones',
  'ID',
  'TipoItem',
  'Modificado',
  'Creado',
  'Creado por',
  'Modificado por',
] as const;

/** Fila de ejemplo orientativa (Modelo2 = Actividad | Repuesto | Fluido | Observacion). */
const TEMPARIO_EXAMPLE_ROW: Record<(typeof TEMPARIO_EXCEL_COLUMNS)[number], string> = {
  Marca: 'HITACHI',
  Linea: 'Excavadoras',
  Modelo: 'ZX210-5',
  Modelo2: 'Actividad',
  Item: 'Inspección visual general',
  Cantidad: 'Unidad',
  'Cantidad (Galones)': '1',
  Frecuencia: '250',
  'Aceite Homologado': '',
  'Referencia Genuina': '',
  'REF SAP DISPEL': '',
  'REF SAP ORIGINAl': '',
  'Referencia Stal': '',
  'Referencia Fleetguard': '',
  'Referencia Donalson': '',
  Tiempo: '0.5',
  Procedimiento: '',
  Observaciones: '',
  ID: '',
  TipoItem: '',
  Modificado: '',
  Creado: '',
  'Creado por': '',
  'Modificado por': '',
};

export const TEMPARIO_TEMPLATE_FILENAME = 'plantilla_temparios_mantenimiento.xlsx';

/**
 * Genera y descarga la plantilla Excel alineada al importador de temparios.
 */
export async function downloadTemparioExcelTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const headers = [...TEMPARIO_EXCEL_COLUMNS];
  const example = headers.map((h) => TEMPARIO_EXAMPLE_ROW[h] ?? '');

  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  sheet['!cols'] = headers.map((h) => ({ wch: Math.min(28, Math.max(12, h.length + 2)) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'TEMPARIOS');
  XLSX.writeFile(workbook, TEMPARIO_TEMPLATE_FILENAME);
}
