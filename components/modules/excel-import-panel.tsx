'use client';

import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { invokeImportExcel, type ImportModulo } from '@/services/import.service';

export interface ExcelImportResult {
  fileName: string;
  recordsOk: number;
  recordsError: number;
  duplicates: number;
  preview: string[];
}

interface ExcelImportPanelProps {
  title: string;
  description: string;
  expectedColumns: string[];
  modulo: ImportModulo;
  onImport: (result: ExcelImportResult) => void | Promise<void>;
  className?: string;
}

/**
 * Panel de importación CSV/Excel.
 * Con Supabase: invoca Edge Function import-excel (CSV).
 * Sin Supabase: simulación local (demo).
 */
export function ExcelImportPanel({
  title,
  description,
  expectedColumns,
  modulo,
  onImport,
  className,
}: ExcelImportPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validExtensions = ['.xlsx', '.xls', '.csv'];

  const validateFile = (f: File): boolean => {
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    return validExtensions.includes(ext);
  };

  const processFile = useCallback(
    async (f: File) => {
      setError(null);
      setProcessing(true);

      try {
        if (isSupabaseConfigured()) {
          const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
          if (ext !== '.csv') {
            throw new Error(
              'Para importación real use CSV (UTF-8). En Excel: Guardar como → CSV UTF-8.'
            );
          }

          const response = await invokeImportExcel(modulo, f);
          setPreview([
            `Archivo: ${f.name}`,
            `Módulo: ${modulo}`,
            `Registros OK: ${response.recordsOk}`,
            `Errores: ${response.recordsError}`,
            `Duplicados: ${response.duplicates}`,
          ]);

          await onImport({
            fileName: f.name,
            recordsOk: response.recordsOk,
            recordsError: response.recordsError,
            duplicates: response.duplicates,
            preview: expectedColumns,
          });
        } else {
          await new Promise((r) => setTimeout(r, 1000));
          const mockRows = Math.floor(20 + Math.random() * 180);
          const mockErrors = Math.floor(Math.random() * 5);
          const mockDuplicates = Math.floor(Math.random() * 8);

          setPreview([
            `Modo demo (sin Supabase): ${f.name}`,
            `Columnas: ${expectedColumns.slice(0, 4).join(', ')}…`,
            `Registros simulados: ${mockRows}`,
            `Duplicados: ${mockDuplicates}`,
            `Errores: ${mockErrors}`,
          ]);

          await onImport({
            fileName: f.name,
            recordsOk: mockRows - mockErrors,
            recordsError: mockErrors,
            duplicates: mockDuplicates,
            preview: expectedColumns,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al importar');
      } finally {
        setProcessing(false);
      }
    },
    [expectedColumns, modulo, onImport]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (!f) return;
      if (!validateFile(f)) {
        setError('Formato no válido. Use .xlsx, .xls o .csv');
        return;
      }
      setFile(f);
      void processFile(f);
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!validateFile(f)) {
      setError('Formato no válido. Use .xlsx, .xls o .csv');
      return;
    }
    setFile(f);
    void processFile(f);
  };

  return (
    <Card className={cn('border-[#50504f]/20', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#50504f]">
          <FileSpreadsheet className="h-4 w-4 text-[#cf1b22]" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
            dragOver ? 'border-[#cf1b22] bg-[#cf1b22]/5' : 'border-muted-foreground/25',
            processing && 'opacity-60 pointer-events-none'
          )}
        >
          {processing ? (
            <Loader2 className="h-8 w-8 mx-auto text-[#cf1b22] animate-spin" />
          ) : (
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          )}
          <p className="mt-2 text-sm font-medium">Arrastre su archivo CSV aquí</p>
          <p className="text-xs text-muted-foreground mt-1">
            Producción: CSV UTF-8 · Demo: también .xlsx/.xls
          </p>
          <label className="mt-4 inline-block">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileInput}
            />
            <Button type="button" variant="outline" size="sm" className="mt-2" asChild>
              <span>Seleccionar archivo</span>
            </Button>
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {file && preview.length > 0 && !processing && (
          <div className="bg-muted/40 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Procesamiento completado — {file.name}
            </div>
            {preview.map((line) => (
              <p key={line} className="text-xs text-muted-foreground font-mono">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="text-[11px] text-muted-foreground border-t pt-3">
          <strong>Columnas requeridas:</strong> {expectedColumns.join(' · ')}
        </div>
      </CardContent>
    </Card>
  );
}
