import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export type ImportModulo = 'calculadora' | 'proyectados' | 'cpp';

export interface ImportExcelResponse {
  importId?: string;
  recordsOk: number;
  recordsError: number;
  duplicates: number;
  total?: number;
  skipped?: number;
  /** Filas del Excel consolidadas por misma serie + mes + año. */
  deduplicated?: number;
  errors?: Array<{ row: number; message: string }>;
  error?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Invoca Edge Function import-excel.
 * Requiere sesión Supabase Auth y archivo CSV.
 */
export async function invokeImportExcel(
  modulo: ImportModulo,
  file: File
): Promise<ImportExcelResponse> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no configurado');
  }

  const supabase = getSupabaseClient();
  const contentBase64 = await fileToBase64(file);

  const { data, error } = await supabase.functions.invoke('import-excel', {
    body: {
      modulo,
      fileName: file.name,
      contentBase64,
      contentType: file.type,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = data as ImportExcelResponse;
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}
