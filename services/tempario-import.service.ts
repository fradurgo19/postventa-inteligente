import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  parseTemparioFile,
  type TemparioImportRow,
} from '@/lib/calculadora/tempario-import';
import type { ImportExcelResponse } from '@/services/import.service';

const BATCH_SIZE = 80;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function upsertTemparioBatch(
  rows: TemparioImportRow[],
  updatedBy: string
): Promise<{ ok: number; updated: number; errors: Array<{ row: number; message: string }> }> {
  const supabase = getSupabaseClient();
  let ok = 0;
  let updated = 0;
  const errors: Array<{ row: number; message: string }> = [];

  const withLegacy = rows.filter((r) => r.legacy_id != null);
  const withoutLegacy = rows.filter((r) => r.legacy_id == null);

  for (const row of withLegacy) {
    const { data: existing, error: findErr } = await supabase
      .from('temparios_mantenimiento')
      .select('id')
      .eq('legacy_id', row.legacy_id)
      .maybeSingle();

    if (findErr) {
      errors.push({ row: row.legacy_id ?? 0, message: findErr.message });
      continue;
    }

    if (existing?.id) {
      const {
        legacy_id: _lid,
        created_by: _cb,
        created_at: _ca,
        ...patch
      } = row;
      const { error: updErr } = await supabase
        .from('temparios_mantenimiento')
        .update({
          ...patch,
          updated_by: updatedBy,
          updated_at: row.updated_at ?? new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updErr) {
        errors.push({ row: row.legacy_id ?? 0, message: updErr.message });
      } else {
        ok += 1;
        updated += 1;
      }
    } else {
      const { error: insErr } = await supabase.from('temparios_mantenimiento').insert(row);
      if (insErr) {
        errors.push({ row: row.legacy_id ?? 0, message: insErr.message });
      } else {
        ok += 1;
      }
    }
  }

  for (const batch of chunkArray(withoutLegacy, BATCH_SIZE)) {
    const { error } = await supabase.from('temparios_mantenimiento').insert(batch);
    if (error) {
      // Fallback fila a fila para no perder todo el lote
      for (const row of batch) {
        const { error: rowErr } = await supabase.from('temparios_mantenimiento').insert(row);
        if (rowErr) {
          errors.push({ row: 0, message: rowErr.message });
        } else {
          ok += 1;
        }
      }
    } else {
      ok += batch.length;
    }
  }

  return { ok, updated, errors };
}

/**
 * Importación completa de temparios desde Excel/CSV en el frontend.
 * Parsea el archivo, valida, inserta/actualiza en lotes y registra la importación.
 */
export async function importTempariosFromFile(
  file: File,
  createdBy = 'admin'
): Promise<ImportExcelResponse> {
  const parsed = await parseTemparioFile(file, createdBy);

  if (parsed.rows.length === 0 && parsed.errors.length > 0) {
    return {
      recordsOk: 0,
      recordsError: parsed.errors.length,
      duplicates: 0,
      total: 0,
      errors: parsed.errors.slice(0, 20),
      error: parsed.errors[0]?.message,
    };
  }

  if (parsed.rows.length === 0) {
    return {
      recordsOk: 0,
      recordsError: 0,
      duplicates: 0,
      total: 0,
      error: 'El archivo no contiene filas de datos',
    };
  }

  if (!isSupabaseConfigured()) {
    // Modo demo: solo validación/parseo
    return {
      recordsOk: parsed.rows.length,
      recordsError: parsed.errors.length,
      duplicates: 0,
      total: parsed.rows.length + parsed.errors.length,
      errors: parsed.errors.slice(0, 20),
    };
  }

  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error(
      'Debe iniciar sesión con Supabase Auth (admin) para importar temparios a la base de datos.'
    );
  }

  const result = await upsertTemparioBatch(parsed.rows, createdBy);
  const recordsOk = result.ok;
  const recordsError = parsed.errors.length + result.errors.length;
  const allErrors = [...parsed.errors, ...result.errors].slice(0, 20);

  try {
    await supabase.from('importaciones').insert({
      modulo: 'calculadora',
      nombre_archivo: file.name,
      tipo_archivo: file.name.split('.').pop() ?? 'xlsx',
      registros_total: parsed.rows.length + parsed.errors.length,
      registros_ok: recordsOk,
      registros_error: recordsError,
      duplicados: result.updated,
      estado: recordsError > 0 ? (recordsOk > 0 ? 'parcial' : 'fallido') : 'completado',
      errores_json: allErrors,
      user_id: session.user.id,
      completed_at: new Date().toISOString(),
    });
  } catch {
    // El log de importación no debe bloquear la carga de temparios
  }

  return {
    recordsOk,
    recordsError,
    duplicates: result.updated,
    total: parsed.rows.length + parsed.errors.length,
    errors: allErrors,
  };
}
