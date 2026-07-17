'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  RotateCcw,
  FileText,
  Save,
  Truck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  Hash,
  List,
  Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  useCalculadoraMarcas,
  useCalculadoraModelos,
  useCalculatePreventive,
} from '@/hooks/use-calculadora';
import { useTelemetriaEquipos } from '@/hooks/use-projected-maintenance';
import { getFrecuenciasPorHorometro, FRECUENCIA_LABELS } from '@/lib/maintenance-frequency';
import { useUserStore } from '@/store';
import { CalculadoraAdminImport } from '@/components/modules/calculadora-admin-import';
import type { TelemetriaEquipo, PreventiveQuoteResult } from '@/types/database';

const HOROMETRO_OPTIONS = Array.from(
  { length: Math.floor((6000 - 250) / 250) + 1 },
  (_, i) => 250 + i * 250
);

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const INACTIVE_ESTADOS = new Set(['inactivo', 'inactiva', 'baja', 'cancelado', 'cancelada']);

interface FilterFormValues {
  brand: string;
  model: string;
  hourMeter: number;
  kilometers: number;
  travelTime: number;
}

interface ReportFilters {
  marca: string;
  modelo: string;
  periodo: string;
  cliente: string;
  mes: string;
}

function sortLocale(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'es'));
}

function matchesReportFilters(m: TelemetriaEquipo, filters: ReportFilters): boolean {
  const estado = (m.estado ?? '').toLowerCase().trim();
  if (estado && INACTIVE_ESTADOS.has(estado)) return false;
  if (filters.marca !== 'all' && m.marca.toLowerCase() !== filters.marca.toLowerCase()) return false;
  if (filters.modelo !== 'all' && m.modelo.toLowerCase() !== filters.modelo.toLowerCase()) return false;
  if (filters.cliente !== 'all' && (m.titulo ?? '') !== filters.cliente) return false;
  return matchesDateFilters(m, filters);
}

function matchesDateFilters(m: TelemetriaEquipo, filters: ReportFilters): boolean {
  if (!m.fecha_primer_mtto) return true;
  const date = new Date(m.fecha_primer_mtto);
  if (filters.mes !== 'all' && MESES[date.getMonth()] !== filters.mes) return false;
  if (filters.periodo !== 'all' && date.getFullYear().toString() !== filters.periodo) return false;
  return true;
}

const filterSchema = z.object({
  brand: z.string().min(1, 'Selecciona una marca'),
  model: z.string().min(1, 'Selecciona un modelo'),
  hourMeter: z.coerce.number().min(250).max(6000),
  kilometers: z.coerce.number().min(0).max(500000),
  travelTime: z.coerce.number().min(0).max(24),
});

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function nearestHorometro(hours: number): number {
  const clamped = Math.min(6000, Math.max(250, hours));
  return Math.round(clamped / 250) * 250;
}

export default function CalculatorPage() {
  const { role } = useUserStore();
  const isAdmin = role === 'Administrator';
  const { data: marcas = [] } = useCalculadoraMarcas();
  const { data: telemetriaData } = useTelemetriaEquipos();
  const telemetria: TelemetriaEquipo[] = telemetriaData ?? [];
  const calculateMutation = useCalculatePreventive();

  const [result, setResult] = useState<PreventiveQuoteResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<TelemetriaEquipo | null>(null);
  const [machineSheetOpen, setMachineSheetOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    marca: 'all',
    modelo: 'all',
    periodo: 'all',
    cliente: 'all',
    mes: 'all',
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      brand: '',
      model: '',
      hourMeter: 250,
      kilometers: 0,
      travelTime: 0,
    },
  });

  const selectedBrand = watch('brand');
  const hourMeter = watch('hourMeter');
  const { data: modelos = [] } = useCalculadoraModelos(selectedBrand);
  const frecuenciasPreview = hourMeter > 0 ? getFrecuenciasPorHorometro(hourMeter) : [];

  const filteredTelemetria = useMemo(
    () => telemetria.filter((m) => matchesReportFilters(m, reportFilters)),
    [telemetria, reportFilters]
  );

  const telemetriaMarcas = useMemo(
    () => sortLocale(Array.from(new Set(telemetria.map((t) => t.marca)))),
    [telemetria]
  );
  const telemetriaModelos = useMemo(() => {
    const source =
      reportFilters.marca === 'all'
        ? telemetria
        : telemetria.filter((t) => t.marca.toLowerCase() === reportFilters.marca.toLowerCase());
    return sortLocale(Array.from(new Set(source.map((t) => t.modelo))));
  }, [telemetria, reportFilters.marca]);
  const telemetriaClientes = useMemo(
    () =>
      sortLocale(
        Array.from(new Set(telemetria.map((t) => t.titulo).filter(Boolean) as string[]))
      ),
    [telemetria]
  );
  const telemetriaPeriodos = useMemo(
    () =>
      sortLocale(
        Array.from(
          new Set(
            telemetria
              .map((t) =>
                t.fecha_primer_mtto ? new Date(t.fecha_primer_mtto).getFullYear().toString() : null
              )
              .filter(Boolean) as string[]
          )
        )
      ),
    [telemetria]
  );

  const onSubmit = async (values: FilterFormValues) => {
    setIsCalculating(true);
    setResult(null);
    try {
      const quote = await calculateMutation.mutateAsync({
        marca: values.brand,
        modelo: values.model,
        horometro: values.hourMeter,
        kmTrayecto: values.kilometers,
        horasTrayecto: values.travelTime,
      });
      setResult(quote);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    reset();
    setResult(null);
    setSelectedMachine(null);
    setReportFilters({
      marca: 'all',
      modelo: 'all',
      periodo: 'all',
      cliente: 'all',
      mes: 'all',
    });
  };

  const handleSelectMachine = (machine: TelemetriaEquipo) => {
    setSelectedMachine(machine);
    setValue('brand', machine.marca, { shouldValidate: true });
    setValue('model', machine.modelo, { shouldValidate: true });
    setValue('hourMeter', nearestHorometro(Number(machine.horometro) || 250), {
      shouldValidate: true,
    });
    setReportFilters((prev) => ({
      ...prev,
      marca: machine.marca,
      modelo: machine.modelo,
      cliente: machine.titulo ?? prev.cliente,
    }));
    setMachineSheetOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 -m-6 min-h-[calc(100vh-8rem)]">
      {/* ── TOP FILTERS ── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border-b border-border px-5 py-4 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#cf1b22] flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Calculadora de Mantenimiento Preventivo
            </h2>
            <p className="text-xs text-muted-foreground">
              Seleccione marca, modelo y horómetro para calcular el servicio
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Marca
            </Label>
            <Controller
              name="brand"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue('model', '');
                    setSelectedMachine(null);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Marca…" />
                  </SelectTrigger>
                  <SelectContent>
                    {marcas.map((b: string) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.brand && (
              <p className="text-xs text-destructive">{errors.brand.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Modelo
            </Label>
            <Controller
              name="model"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setSelectedMachine(null);
                  }}
                  disabled={!selectedBrand}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={selectedBrand ? 'Modelo…' : 'Marca primero'} />
                  </SelectTrigger>
                  <SelectContent>
                    {modelos.map((m: string) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.model && (
              <p className="text-xs text-destructive">{errors.model.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Horómetro (h)
            </Label>
            <Controller
              name="hourMeter"
              control={control}
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccione…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {HOROMETRO_OPTIONS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h.toLocaleString('es-CO')} h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {frecuenciasPreview.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {frecuenciasPreview.map((f) => (
                  <Badge
                    key={f}
                    variant="outline"
                    className="text-[10px] border-[#cf1b22]/30 text-[#cf1b22]"
                  >
                    {FRECUENCIA_LABELS[f]}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Km trayecto
            </Label>
            <div className="relative">
              <Gauge className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                className="h-9 text-sm pl-8"
                {...register('kilometers')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tiempo viaje (h)
            </Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                step={0.5}
                className="h-9 text-sm pl-8"
                {...register('travelTime')}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 h-9 text-sm font-semibold bg-[#cf1b22] hover:bg-[#a51519] text-white"
              disabled={isCalculating}
            >
              <Wrench className="w-4 h-4 mr-1.5" />
              {isCalculating ? 'Calculando…' : 'Calcular'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3"
              onClick={handleReset}
              disabled={isCalculating}
              aria-label="Reiniciar"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>

      {/* ── REPORT FILTERS ── */}
      <div className="px-5">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-[#cf1b22]" />
              <span className="text-sm font-semibold">Filtros del informe</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Select
                value={reportFilters.marca}
                onValueChange={(v) =>
                  setReportFilters((p) => ({ ...p, marca: v, modelo: 'all' }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {telemetriaMarcas.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={reportFilters.modelo}
                onValueChange={(v) => setReportFilters((p) => ({ ...p, modelo: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los modelos</SelectItem>
                  {telemetriaModelos.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={reportFilters.periodo}
                onValueChange={(v) => setReportFilters((p) => ({ ...p, periodo: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los periodos</SelectItem>
                  {telemetriaPeriodos.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={reportFilters.cliente}
                onValueChange={(v) => setReportFilters((p) => ({ ...p, cliente: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {telemetriaClientes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={reportFilters.mes}
                onValueChange={(v) => setReportFilters((p) => ({ ...p, mes: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {MESES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── MAIN + SUMMARY ── */}
      <div className="flex flex-1 gap-0 min-h-0 px-0 pb-0">
        <main className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Selected equipment card */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-44 h-32 sm:h-auto bg-muted/70 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-border gap-2">
                  <Truck className="w-10 h-10 text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide">
                    {selectedMachine?.marca ?? 'Equipo'}
                  </span>
                </div>
                <div className="flex-1 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {selectedMachine
                          ? `${selectedMachine.marca} ${selectedMachine.modelo}`
                          : 'Sin equipo seleccionado'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedMachine
                          ? 'Equipo seleccionado de telemetría'
                          : 'Seleccione una máquina de telemetría o calcule por marca/modelo'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-[#cf1b22]/30 text-[#cf1b22] hover:bg-[#cf1b22]/5"
                      onClick={() => setMachineSheetOpen(true)}
                    >
                      <List className="w-4 h-4 mr-1.5" />
                      Ver máquinas telemetría
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filteredTelemetria.length}
                      </Badge>
                    </Button>
                  </div>

                  {selectedMachine ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { icon: Hash, label: 'Serie', value: selectedMachine.serie },
                        {
                          icon: Clock,
                          label: 'Horómetro',
                          value: `${Number(selectedMachine.horometro).toLocaleString('es-CO')} h`,
                        },
                        {
                          icon: Truck,
                          label: 'Cliente',
                          value: selectedMachine.titulo ?? 'N/A',
                        },
                        {
                          icon: MapPin,
                          label: 'Sede / Ciudad',
                          value: selectedMachine.sede ?? selectedMachine.ciudad ?? 'N/A',
                        },
                        {
                          icon: Gauge,
                          label: 'Estado',
                          value: selectedMachine.estado ?? 'N/A',
                        },
                        {
                          icon: CheckCircle2,
                          label: 'Próximo mtto',
                          value: selectedMachine.fecha_primer_mtto ?? 'N/A',
                        },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                              {label}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground pl-4 truncate">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Use el botón para listar las máquinas de telemetría y seleccionar una.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results tabs */}
          <AnimatePresence mode="wait">
            {isCalculating && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-8 w-48" />
                  {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((id) => (
                    <Skeleton key={id} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
            )}
            {!isCalculating && result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Card>
                  <CardContent className="p-4">
                    <Tabs defaultValue="activities">
                      <TabsList className="mb-4">
                        <TabsTrigger value="activities" className="text-sm">
                          Actividades
                          <Badge variant="secondary" className="ml-1.5 text-xs font-normal">
                            {result.activities.length}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="consumables" className="text-sm">
                          Consumibles
                          <Badge variant="secondary" className="ml-1.5 text-xs font-normal">
                            {result.consumables.length}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="parts" className="text-sm">
                          Repuestos
                          <Badge variant="secondary" className="ml-1.5 text-xs font-normal">
                            {result.parts.length}
                          </Badge>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="activities" className="mt-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead>Actividad</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Horas MO</TableHead>
                                <TableHead className="text-right">Repuestos</TableHead>
                                <TableHead className="text-right">Consumibles</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.activities.map((act) => (
                                <TableRow key={act.id}>
                                  <TableCell className="font-medium text-sm whitespace-nowrap">
                                    {act.activity}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {act.description}
                                  </TableCell>
                                  <TableCell className="text-sm text-right tabular-nums">
                                    {act.laborHours.toFixed(1)}
                                  </TableCell>
                                  <TableCell className="text-sm text-right tabular-nums">
                                    {formatCOP(act.parts)}
                                  </TableCell>
                                  <TableCell className="text-sm text-right tabular-nums">
                                    {formatCOP(act.consumables)}
                                  </TableCell>
                                  <TableCell className="text-sm text-right font-semibold tabular-nums">
                                    {formatCOP(act.subtotal)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      <TabsContent value="consumables" className="mt-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead>Ítem</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead className="text-right">Precio Unit.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.consumables.map((c, i) => (
                                <TableRow key={`${c.item}-${i}`}>
                                  <TableCell className="font-medium text-sm">{c.item}</TableCell>
                                  <TableCell className="text-right tabular-nums">{c.quantity}</TableCell>
                                  <TableCell className="text-muted-foreground">{c.unit}</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {formatCOP(c.unitPrice)}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold tabular-nums">
                                    {formatCOP(c.total)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                  Total Consumibles
                                </TableCell>
                                <TableCell className="text-right font-bold tabular-nums">
                                  {formatCOP(result.costs.consumables)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      <TabsContent value="parts" className="mt-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead>Código SAP</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead className="text-right">Precio Unit.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.parts.map((p, i) => (
                                <TableRow key={`${p.sapCode}-${i}`}>
                                  <TableCell>
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                      {p.sapCode}
                                    </code>
                                  </TableCell>
                                  <TableCell className="font-medium text-sm">{p.description}</TableCell>
                                  <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {formatCOP(p.unitPrice)}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold tabular-nums">
                                    {formatCOP(p.total)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                  Total Repuestos
                                </TableCell>
                                <TableCell className="text-right font-bold tabular-nums">
                                  {formatCOP(result.costs.parts)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {!isCalculating && !result && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Wrench className="w-10 h-10 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">Sin cálculo aún</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Complete marca, modelo y horómetro en la barra superior, o seleccione una
                    máquina de telemetría y pulse Calcular.
                  </p>
                </CardContent>
              </Card>
            )}
          </AnimatePresence>

          {isAdmin && (
            <div className="pt-2">
              <CalculadoraAdminImport />
            </div>
          )}
        </main>

        {/* Right summary */}
        <aside className="w-[300px] flex-shrink-0 border-l border-border bg-card overflow-y-auto hidden lg:block">
          <div className="p-5">
            {result ? (
              <Card>
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#cf1b22]" />
                    Resumen de Costos
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="space-y-2.5 mb-4">
                    {[
                      { label: 'Mano de Obra', value: result.costs.labor },
                      { label: 'Consumibles', value: result.costs.consumables },
                      { label: 'Repuestos', value: result.costs.parts },
                      { label: 'Viaje', value: result.costs.travel },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm tabular-nums font-medium">{formatCOP(value)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCOP(result.costs.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">IVA (19%)</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCOP(result.costs.vat)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-[#cf1b22]/5 border border-[#cf1b22]/20 mb-5">
                    <span className="text-sm font-bold text-[#cf1b22]">TOTAL</span>
                    <span className="text-base font-extrabold text-[#cf1b22] tabular-nums">
                      {formatCOP(result.costs.total)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Button className="w-full h-9 bg-[#cf1b22] hover:bg-[#a51519] text-white">
                      <FileText className="w-4 h-4 mr-2" />
                      Generar PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-9 border-[#cf1b22]/30 text-[#cf1b22]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cotización
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[240px] text-center px-4">
                <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Resumen de Costos</p>
                <p className="text-xs text-muted-foreground mt-1">Aparecerá después del cálculo</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Telemetry machines sheet */}
      <Sheet open={machineSheetOpen} onOpenChange={setMachineSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Máquinas de telemetría</SheetTitle>
            <SheetDescription>
              Listado filtrado ({filteredTelemetria.length}). Seleccione una para cargar marca,
              modelo y horómetro.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {filteredTelemetria.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No hay máquinas con los filtros actuales.
              </p>
            ) : (
              filteredTelemetria.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMachine(m)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:border-[#cf1b22]/40 hover:bg-[#cf1b22]/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {m.marca} {m.modelo}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{m.serie}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.titulo ?? 'Sin cliente'} · {m.sede ?? m.ciudad ?? '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {Number(m.horometro).toLocaleString('es-CO')} h
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
