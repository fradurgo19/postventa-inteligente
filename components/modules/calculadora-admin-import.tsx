'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Database,
  Pencil,
  Search,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { ExcelImportPanel } from '@/components/modules/excel-import-panel';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  useTemparioImport,
  useTempariosAdmin,
  useUpdateTempario,
  useDeactivateTempario,
  useCalculadoraMarcas,
  useCalculadoraModelos,
  useCalculadoraTipos,
} from '@/hooks/use-calculadora';
import { useUserStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { TemparioMantenimiento, TemparioTipoItem, MaintenanceFrequencyHours } from '@/types/database';

const TEMPARIO_COLUMNS = [
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
];

const TIPOS_ITEM: TemparioTipoItem[] = [
  'Repuesto',
  'Fluido',
  'Actividad',
  'Observacion',
  'Consumible',
  'Servicio',
];
const FRECUENCIAS: MaintenanceFrequencyHours[] = [250, 1000, 2000, 4000, 5000];
const PAGE_SIZE = 15;

type EditForm = {
  marca: string;
  linea: string;
  modelo: string;
  tipo_item: TemparioTipoItem;
  item: string;
  unidad_medida: string;
  cantidad: string;
  frecuencia_horas: string;
  aceite_homologado: string;
  referencia_genuina: string;
  ref_sap_dispel: string;
  ref_sap_original: string;
  referencia_stal: string;
  referencia_fleetguard: string;
  referencia_donaldson: string;
  tiempo_horas: string;
  procedimiento: string;
  avisos_claves: string;
  precio_unitario: string;
  activo: boolean;
};

function toEditForm(row: TemparioMantenimiento): EditForm {
  return {
    marca: row.marca,
    linea: row.linea ?? '',
    modelo: row.modelo,
    tipo_item: row.tipo_item,
    item: row.item,
    unidad_medida: row.unidad_medida,
    cantidad: String(row.cantidad),
    frecuencia_horas: String(row.frecuencia_horas),
    aceite_homologado: row.aceite_homologado ?? '',
    referencia_genuina: row.referencia_genuina ?? '',
    ref_sap_dispel: row.ref_sap_dispel ?? '',
    ref_sap_original: row.ref_sap_original ?? '',
    referencia_stal: row.referencia_stal ?? '',
    referencia_fleetguard: row.referencia_fleetguard ?? '',
    referencia_donaldson: row.referencia_donaldson ?? '',
    tiempo_horas: String(row.tiempo_horas),
    procedimiento: row.procedimiento ?? '',
    avisos_claves: row.avisos_claves ?? '',
    precio_unitario: String(row.precio_unitario ?? 0),
    activo: row.activo,
  };
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

export function CalculadoraAdminImport() {
  const { currentUser } = useUserStore();
  const updatedBy = currentUser?.email ?? currentUser?.name ?? 'Administrator';

  const [tab, setTab] = useState('registros');
  const [marca, setMarca] = useState('all');
  const [modelo, setModelo] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TemparioMantenimiento | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  const importMutation = useTemparioImport();
  const updateMutation = useUpdateTempario();
  const deactivateMutation = useDeactivateTempario();
  const { data: marcasData } = useCalculadoraMarcas();
  const marcas: string[] = marcasData ?? [];
  const { data: modelosData } = useCalculadoraModelos(marca === 'all' ? '' : marca);
  const modelos: string[] = modelosData ?? [];
  const { data: tiposData } = useCalculadoraTipos();
  const tipos: string[] = tiposData ?? [];

  const adminQuery = useMemo(
    () => ({
      marca,
      modelo,
      tipo,
      search,
      page,
      pageSize: PAGE_SIZE,
      includeInactive: false,
    }),
    [marca, modelo, tipo, search, page]
  );

  const { data, isLoading, isFetching, refetch } = useTempariosAdmin(adminQuery);
  const rows: TemparioMantenimiento[] = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openEdit = (row: TemparioMantenimiento) => {
    setEditing(row);
    setForm(toEditForm(row));
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(null);
  };

  const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!editing || !form) return;
    if (!form.marca.trim() || !form.modelo.trim() || !form.item.trim()) {
      toast.error('Marca, Modelo e Item son obligatorios');
      return;
    }

    const freq = Number(form.frecuencia_horas) as MaintenanceFrequencyHours;
    if (!FRECUENCIAS.includes(freq)) {
      toast.error('Frecuencia inválida');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        updatedBy,
        patch: {
          marca: form.marca.trim(),
          linea: form.linea.trim() || null,
          modelo: form.modelo.trim(),
          tipo_item: form.tipo_item,
          item: form.item.trim(),
          unidad_medida: form.unidad_medida.trim() || 'Unidad',
          cantidad: Number(form.cantidad) || 1,
          frecuencia_horas: freq,
          aceite_homologado: form.aceite_homologado.trim() || null,
          referencia_genuina: form.referencia_genuina.trim() || null,
          ref_sap_dispel: form.ref_sap_dispel.trim() || null,
          ref_sap_original: form.ref_sap_original.trim() || null,
          referencia_stal: form.referencia_stal.trim() || null,
          referencia_fleetguard: form.referencia_fleetguard.trim() || null,
          referencia_donaldson: form.referencia_donaldson.trim() || null,
          tiempo_horas: Number(form.tiempo_horas) || 0,
          procedimiento: form.procedimiento.trim() || null,
          avisos_claves: form.avisos_claves.trim() || null,
          precio_unitario: Number(form.precio_unitario) || 0,
          activo: form.activo,
        },
      });
      toast.success('Tempario actualizado');
      closeEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  const handleDeactivate = async (row: TemparioMantenimiento) => {
    const ok = window.confirm(`¿Desactivar el ítem "${row.item}" (${row.marca} ${row.modelo})?`);
    if (!ok) return;
    try {
      await deactivateMutation.mutateAsync({ id: row.id, updatedBy });
      toast.success('Registro desactivado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo desactivar');
    }
  };

  return (
    <div className="mt-6 border-t border-border pt-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#cf1b22]/10 flex items-center justify-center shrink-0">
          <Database className="h-4 w-4 text-[#cf1b22]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Administración — Temparios de Mantenimiento
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Solo administradores. Carga masiva desde Excel y edición de registros en la base de
            datos que alimenta la calculadora.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="registros" className="text-sm">
            Gestionar registros
          </TabsTrigger>
          <TabsTrigger value="importar" className="text-sm">
            Carga masiva Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="mt-4">
          <ExcelImportPanel
            title="Importar Temparios de Mantenimiento"
            description="Excel real: la clasificación va en Modelo2 (Actividad / Repuesto / Fluido / Observacion). Cantidad = unidad; Cantidad (Galones) = cantidad; Tiempo = horas MO. Si existe ID, se actualiza (upsert)."
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

              const totalMsg = result.total
                ? ` de ${result.total} filas del Excel`
                : '';

              if (result.recordsOk > 0) {
                toast.success('Carga de temparios finalizada', {
                  description:
                    `${result.recordsOk} registros cargados OK${totalMsg}` +
                    (result.duplicates ? ` · ${result.duplicates} actualizados` : '') +
                    (result.recordsError ? ` · ${result.recordsError} con error` : ''),
                  duration: 12_000,
                });
              } else {
                toast.error('No se importaron registros', {
                  description:
                    result.errors?.[0]?.message ??
                    `${result.recordsError} errores${totalMsg}`,
                  duration: 12_000,
                });
              }

              // Mantener un momento el resumen en "Carga masiva", luego ir a registros
              setTimeout(() => {
                setTab('registros');
                setPage(1);
                void refetch();
              }, 1500);
            }}
          />
        </TabsContent>

        <TabsContent value="registros" className="mt-4 space-y-3">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold">
                  Registros en base de datos
                  <Badge variant="secondary" className="ml-2 font-normal">
                    {total}
                  </Badge>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setSearch(searchInput.trim());
                          setPage(1);
                        }
                      }}
                      placeholder="Buscar ítem / ref…"
                      className="h-8 pl-8 w-44 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setSearch(searchInput.trim());
                      setPage(1);
                    }}
                  >
                    Buscar
                  </Button>
                  <Select
                    value={marca}
                    onValueChange={(v) => {
                      setMarca(v);
                      setModelo('all');
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-36 text-sm">
                      <SelectValue placeholder="Marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {marcas.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={modelo}
                    onValueChange={(v) => {
                      setModelo(v);
                      setPage(1);
                    }}
                    disabled={marca === 'all'}
                  >
                    <SelectTrigger className="h-8 w-36 text-sm">
                      <SelectValue placeholder="Modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {modelos.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={tipo}
                    onValueChange={(v) => {
                      setTipo(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-36 text-sm">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {tipos.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => void refetch()}
                    aria-label="Actualizar"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Marca</TableHead>
                      <TableHead className="text-xs">Línea</TableHead>
                      <TableHead className="text-xs">Modelo</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Catálogo</TableHead>
                      <TableHead className="text-xs">Ítem</TableHead>
                      <TableHead className="text-xs text-right">Cant.</TableHead>
                      <TableHead className="text-xs">Freq.</TableHead>
                      <TableHead className="text-xs">Ref. genuina</TableHead>
                      <TableHead className="text-xs">Modificado</TableHead>
                      <TableHead className="text-xs text-right pr-4">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`sk-${i}`}>
                          <TableCell colSpan={12}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          className="text-center text-sm text-muted-foreground py-10"
                        >
                          No hay temparios con los filtros actuales. Importe un Excel o ajuste la
                          búsqueda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {row.legacy_id ?? row.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{row.marca}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.linea || '—'}
                          </TableCell>
                          <TableCell className="text-xs">{row.modelo}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {row.tipo_item}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.tipo_catalogo || '—'}
                          </TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate" title={row.item}>
                            {row.item}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {row.cantidad}
                          </TableCell>
                          <TableCell className="text-xs tabular-nums">
                            {row.frecuencia_horas} h
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {row.referencia_genuina || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(row.updated_at)}
                          </TableCell>
                          <TableCell className="text-right pr-3">
                            <div className="inline-flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[#cf1b22]"
                                onClick={() => openEdit(row)}
                                aria-label="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => void handleDeactivate(row)}
                                disabled={deactivateMutation.isPending}
                                aria-label="Desactivar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editing && form)} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar tempario</DialogTitle>
            <DialogDescription>
              Modifique los campos del registro. Los cambios impactan la calculadora de
              mantenimiento.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <Field label="Marca *">
                <Input value={form.marca} onChange={(e) => setField('marca', e.target.value)} />
              </Field>
              <Field label="Línea">
                <Input value={form.linea} onChange={(e) => setField('linea', e.target.value)} />
              </Field>
              <Field label="Modelo *">
                <Input value={form.modelo} onChange={(e) => setField('modelo', e.target.value)} />
              </Field>
              <Field label="Tipo de ítem">
                <Select
                  value={form.tipo_item}
                  onValueChange={(v) => setField('tipo_item', v as TemparioTipoItem)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ITEM.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ítem *" className="sm:col-span-2">
                <Input value={form.item} onChange={(e) => setField('item', e.target.value)} />
              </Field>
              <Field label="Unidad de medida">
                <Input
                  value={form.unidad_medida}
                  onChange={(e) => setField('unidad_medida', e.target.value)}
                />
              </Field>
              <Field label="Cantidad">
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.cantidad}
                  onChange={(e) => setField('cantidad', e.target.value)}
                />
              </Field>
              <Field label="Frecuencia (horas)">
                <Select
                  value={form.frecuencia_horas}
                  onValueChange={(v) => setField('frecuencia_horas', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRECUENCIAS.map((f) => (
                      <SelectItem key={f} value={String(f)}>
                        {f} h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tiempo (horas)">
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.tiempo_horas}
                  onChange={(e) => setField('tiempo_horas', e.target.value)}
                />
              </Field>
              <Field label="Aceite homologado">
                <Input
                  value={form.aceite_homologado}
                  onChange={(e) => setField('aceite_homologado', e.target.value)}
                />
              </Field>
              <Field label="Referencia genuina">
                <Input
                  value={form.referencia_genuina}
                  onChange={(e) => setField('referencia_genuina', e.target.value)}
                />
              </Field>
              <Field label="REF SAP DISPEL">
                <Input
                  value={form.ref_sap_dispel}
                  onChange={(e) => setField('ref_sap_dispel', e.target.value)}
                />
              </Field>
              <Field label="REF SAP ORIGINAL">
                <Input
                  value={form.ref_sap_original}
                  onChange={(e) => setField('ref_sap_original', e.target.value)}
                />
              </Field>
              <Field label="Referencia Stal">
                <Input
                  value={form.referencia_stal}
                  onChange={(e) => setField('referencia_stal', e.target.value)}
                />
              </Field>
              <Field label="Referencia Fleetguard">
                <Input
                  value={form.referencia_fleetguard}
                  onChange={(e) => setField('referencia_fleetguard', e.target.value)}
                />
              </Field>
              <Field label="Referencia Donaldson">
                <Input
                  value={form.referencia_donaldson}
                  onChange={(e) => setField('referencia_donaldson', e.target.value)}
                />
              </Field>
              <Field label="Precio unitario">
                <Input
                  type="number"
                  min={0}
                  value={form.precio_unitario}
                  onChange={(e) => setField('precio_unitario', e.target.value)}
                />
              </Field>
              <Field label="Procedimiento" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={form.procedimiento}
                  onChange={(e) => setField('procedimiento', e.target.value)}
                />
              </Field>
              <Field label="Avisos claves" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={form.avisos_claves}
                  onChange={(e) => setField('avisos_claves', e.target.value)}
                />
              </Field>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeEdit}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#cf1b22] hover:bg-[#a51519] text-white"
              onClick={() => void handleSave()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: Readonly<{
  label: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
