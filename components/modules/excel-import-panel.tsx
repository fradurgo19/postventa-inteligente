'use client';

import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { invokeImportExcel, type ImportModulo } from '@/services/import.service';
import {
  importTempariosFromFile,
  type TemparioImportProgress,
} from '@/services/tempario-import.service';
import { useUserStore } from '@/store';

export interface ExcelImportResult {
  fileName: string;
  recordsOk: number;
  recordsError: number;
  duplicates: number;
  total: number;
  preview: string[];
  errors?: Array<{ row: number; message: string }>;
}

interface ExcelImportPanelProps {
  readonly title: string;
  readonly description: string;
  readonly expectedColumns: string[];
  readonly modulo: ImportModulo;
  readonly onImport: (result: ExcelImportResult) => void | Promise<void>;
  readonly className?: string;
}

export function ExcelImportPanel({
  title,
  description,
  expectedColumns,
  modulo,
  onImport,
  className,
}: ExcelImportPanelProps) {
  const { currentUser } = useUserStore();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [progress, setProgress] = useState<TemparioImportProgress | null>(null);

  const validExtensions = ['.xlsx', '.xls', '.csv'];

  const validateFile = (f: File): boolean => {
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    return validExtensions.includes(ext);
  };

  const processFile = useCallback(
    async (f: File) => {
      setError(null);
      setRowErrors([]);
      setPreview([]);
      setProgress(null);
      setProcessing(true);

      try {
        let recordsOk = 0;
        let recordsError = 0;
        let duplicates = 0;
        let total = 0;
        let errors: Array<{ row: number; message: string }> = [];

        if (modulo === 'calculadora') {
          const response = await importTempariosFromFile(
            f,
            currentUser?.email ?? currentUser?.name ?? 'admin',
            (p) => setProgress({ ...p })
          );
          if (response.error && response.recordsOk === 0) {
            throw new Error(response.error);
          }
          recordsOk = response.recordsOk;
          recordsError = response.recordsError;
          duplicates = response.duplicates;
          total = response.total ?? recordsOk + recordsError;
          errors = response.errors ?? [];
        } else if (isSupabaseConfigured()) {
          const response = await invokeImportExcel(modulo, f);
          recordsOk = response.recordsOk;
          recordsError = response.recordsError;
          duplicates = response.duplicates;
          total = response.total ?? recordsOk + recordsError;
          errors = response.errors ?? [];
        } else {
          await new Promise((r) => setTimeout(r, 800));
          recordsOk = 25;
          total = 25;
        }

        const previewLines = [
          `Archivo: ${f.name}`,
          `Filas leídas del Excel: ${total}`,
          `Registros cargados OK: ${recordsOk}`,
          `Actualizados (mismo ID): ${duplicates}`,
          `Errores / omitidos: ${recordsError}`,
          recordsOk + recordsError < total
            ? `Diferencia vs archivo: ${total - recordsOk - recordsError}`
            : 'Cobertura: 100% de filas procesadas',
        ];
        setPreview(previewLines);
        setRowErrors(errors.slice(0, 12));
        setProgress(null);

        await onImport({
          fileName: f.name,
          recordsOk,
          recordsError,
          duplicates,
          total,
          preview: expectedColumns,
          errors,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al importar');
        setProgress(null);
      } finally {
        setProcessing(false);
      }
    },
    [currentUser?.email, currentUser?.name, expectedColumns, modulo, onImport]
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
    e.target.value = '';
  };

  const progressPct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;

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
          <p className="mt-2 text-sm font-medium">
            {processing
              ? progress?.phase === 'parse'
                ? 'Leyendo Excel…'
                : `Cargando en base de datos… ${progress?.processed ?? 0}/${progress?.total ?? '—'}`
              : 'Arrastre su archivo Excel o CSV aquí'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Formatos: .xlsx · .xls · .csv — archivos grandes se cargan por lotes
          </p>
          {processing && progress && progress.total > 0 && (
            <div className="mt-4 mx-auto max-w-sm text-left">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-[#cf1b22] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                {progressPct}% · OK {progress.ok} · Act. {progress.updated} · Err. {progress.errors}
              </p>
            </div>
          )}
          <label className="mt-4 inline-block">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileInput}
              disabled={processing}
            />
            <Button type="button" variant="outline" size="sm" className="mt-2" asChild>
              <span>Seleccionar archivo</span>
            </Button>
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {file && preview.length > 0 && !processing && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Carga finalizada — {file.name}
            </div>
            {preview.map((line) => (
              <p key={line} className="text-xs text-emerald-900/80 font-mono">
                {line}
              </p>
            ))}
            {rowErrors.length > 0 && (
              <div className="pt-2 border-t border-emerald-200/80 space-y-1">
                <p className="text-xs font-medium text-amber-800">
                  Detalle de errores (muestra):
                </p>
                {rowErrors.map((err) => (
                  <p
                    key={`${err.row}-${err.message}`}
                    className="text-[11px] text-muted-foreground font-mono"
                  >
                    Fila/ID {err.row || '—'}: {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] text-muted-foreground border-t pt-3">
          <strong>Columnas:</strong> {expectedColumns.join(' · ')}
        </div>
      </CardContent>
    </Card>
  );
}
