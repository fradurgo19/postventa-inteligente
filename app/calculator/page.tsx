"use client";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  RotateCcw,
  FileText,
  Save,
  Truck,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  Hash,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCalculadoraMarcas, useCalculadoraModelos, useCalculatePreventive } from "@/hooks/use-calculadora";
import { getFrecuenciasPorHorometro, FRECUENCIA_LABELS } from "@/lib/maintenance-frequency";
import { useUserStore } from "@/store";
import { CalculadoraAdminImport } from "@/components/modules/calculadora-admin-import";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterFormValues {
  brand: string;
  model: string;
  hourMeter: number;
  kilometers: number;
  travelTime: number;
}

interface MaintenanceActivity {
  id: string;
  activity: string;
  description: string;
  laborHours: number;
  parts: number;
  consumables: number;
  subtotal: number;
}

interface ConsumableItem {
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface PartItem {
  sapCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface EquipmentResult {
  brand: string;
  model: string;
  serialNumber: string;
  year: number;
  hours: number;
  kilometers: number;
  status: "active" | "maintenance";
  activities: MaintenanceActivity[];
  consumables: ConsumableItem[];
  parts: PartItem[];
  costs: {
    labor: number;
    consumables: number;
    parts: number;
    travel: number;
    subtotal: number;
    vat: number;
    total: number;
  };
}

type SortDirection = "asc" | "desc" | null;
type SortKey = keyof MaintenanceActivity;

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const filterSchema = z.object({
  brand: z.string().min(1, "Selecciona una marca"),
  model: z.string().min(1, "Selecciona un modelo"),
  hourMeter: z.coerce.number().min(0).max(50000),
  kilometers: z.coerce.number().min(0).max(500000),
  travelTime: z.coerce.number().min(0).max(24),
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonCenter() {
  return (
    <div className="space-y-6">
      {/* Equipment card skeleton */}
      <Card>
        <CardContent className="p-5">
          <div className="flex gap-5">
            <Skeleton className="h-28 w-36 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SkeletonSummary() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
        <Separator />
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full min-h-[420px] text-center px-8"
    >
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-5">
        <Wrench className="w-9 h-9 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-foreground">
        Sin Cálculo Aún
      </h3>
      <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
        Selecciona una marca y modelo de equipo, ingresa las lecturas actuales
        del medidor y haz clic en <span className="font-semibold text-foreground">Calcular</span> para generar
        una estimación de costos de mantenimiento.
      </p>
      <div className="mt-6 flex flex-col gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#cf1b22]" />
          Diligencia Marca y Modelo
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#cf1b22]" />
          Ingresa Horómetro y Kilómetros
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#cf1b22]" />
          Haz clic en Calcular para obtener resultados
        </div>
      </div>
    </motion.div>
  );
}

// Sortable table header cell
function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: { key: SortKey; dir: SortDirection };
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort.key === sortKey;
  return (
    <TableHead
      className="cursor-pointer select-none group whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
          {isActive && currentSort.dir === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : isActive && currentSort.dir === "desc" ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronsUpDown className="w-3.5 h-3.5" />
          )}
        </span>
      </span>
    </TableHead>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const { role } = useUserStore();
  const isAdmin = role === "Administrator";
  const { data: marcas = [] } = useCalculadoraMarcas();
  const calculateMutation = useCalculatePreventive();

  const [result, setResult] = useState<EquipmentResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDirection }>({
    key: "activity",
    dir: null,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      brand: "",
      model: "",
      hourMeter: 0,
      kilometers: 0,
      travelTime: 0,
    },
  });

  const selectedBrand = watch("brand");
  const hourMeter = watch("hourMeter");
  const { data: modelos = [] } = useCalculadoraModelos(selectedBrand);
  const availableModels = modelos;
  const frecuenciasPreview = hourMeter > 0 ? getFrecuenciasPorHorometro(hourMeter) : [];

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
    setSort({ key: "activity", dir: null });
  };

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: null };
      return { key, dir: "asc" };
    });
  };

  const sortedActivities = useMemo(() => {
    if (!result) return [];
    if (!sort.dir) return result.activities;
    return [...result.activities].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.dir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.dir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [result, sort]);

  const showSummaryContent = isCalculating || result;

  return (
    <div className="flex gap-0 h-[calc(100vh-8rem)] -m-6 overflow-hidden">
      {/* ── LEFT PANEL ── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-[280px] flex-shrink-0 border-r border-border bg-card overflow-y-auto scrollbar-thin"
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#cf1b22] flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground leading-tight">
                Calculadora de
              </h2>
              <h2 className="text-sm font-semibold text-foreground leading-tight">
                Mantenimiento
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Brand */}
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
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecciona una marca…" />
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

            {/* Model */}
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
                    onValueChange={field.onChange}
                    disabled={!selectedBrand}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue
                        placeholder={
                          selectedBrand ? "Selecciona un modelo…" : "Selecciona una marca primero"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m: string) => (
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

            <Separator />

            {/* Hour Meter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Horómetro (h)
              </Label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  max={50000}
                  className="h-9 text-sm pl-8"
                  placeholder="0"
                  {...register("hourMeter")}
                />
              </div>
              {errors.hourMeter && (
                <p className="text-xs text-destructive">{errors.hourMeter.message}</p>
              )}
              {frecuenciasPreview.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
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

            {/* Kilometers */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Kilómetros
              </Label>
              <div className="relative">
                <Gauge className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  max={500000}
                  className="h-9 text-sm pl-8"
                  placeholder="0"
                  {...register("kilometers")}
                />
              </div>
              {errors.kilometers && (
                <p className="text-xs text-destructive">{errors.kilometers.message}</p>
              )}
            </div>

            {/* Travel Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tiempo de Viaje (h)
              </Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  className="h-9 text-sm pl-8"
                  placeholder="0"
                  {...register("travelTime")}
                />
              </div>
              {errors.travelTime && (
                <p className="text-xs text-destructive">{errors.travelTime.message}</p>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <Button
                type="submit"
                className="w-full h-9 text-sm font-semibold bg-[#cf1b22] hover:bg-[#a51519] text-white"
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      className="inline-block mr-2"
                    >
                      <Wrench className="w-4 h-4" />
                    </motion.span>
                    Calculando…
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Calcular
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 text-sm"
                onClick={handleReset}
                disabled={isCalculating}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                Reiniciar
              </Button>
            </div>
          </form>

          {/* Info note */}
          <div className="mt-5 p-3 rounded-lg bg-muted/60 border border-border/50">
            <div className="flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Los precios son indicativos. La cotización final está sujeta a disponibilidad de repuestos y condiciones de campo.
              </p>
            </div>
          </div>

          {isAdmin && <CalculadoraAdminImport />}
        </div>
      </motion.aside>

      {/* ── CENTER PANEL ── */}
      <main className="flex-1 overflow-y-auto scrollbar-thin bg-background">
        <div className="p-5 space-y-5">
          <AnimatePresence mode="wait">
            {isCalculating ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SkeletonCenter />
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-5"
              >
                {/* Equipment Info Card */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Machine image placeholder */}
                      <div className="w-full sm:w-44 h-36 sm:h-auto bg-muted/70 flex flex-col items-center justify-center flex-shrink-0 border-b sm:border-b-0 sm:border-r border-border gap-2">
                        <Truck className="w-12 h-12 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide font-medium">
                          {result.brand}
                        </span>
                      </div>
                      {/* Info grid */}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-foreground">
                              {result.brand} {result.model}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Informe de Mantenimiento Preventivo
                            </p>
                          </div>
                          <Badge
                            className={
                              result.status === "active"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
                            }
                            variant="outline"
                          >
                            {result.status === "active" ? (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                              <Wrench className="w-3 h-3 mr-1" />
                            )}
                            {result.status === "active" ? "Activo" : "En Mantenimiento"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { icon: Hash, label: "Número de Serie", value: result.serialNumber },
                            { icon: Calendar, label: "Año", value: result.year.toString() },
                            { icon: Truck, label: "Marca / Modelo", value: `${result.brand} / ${result.model}` },
                            { icon: Clock, label: "Horas Actuales", value: `${result.hours.toLocaleString()} h` },
                            { icon: Gauge, label: "Kilómetros", value: result.kilometers.toLocaleString() },
                            { icon: MapPin, label: "Tiempo de Viaje", value: `${watch("travelTime")} h` },
                          ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Icon className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                  {label}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-foreground pl-4">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Maintenance Activities Table */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#cf1b22]" />
                      Actividades de Mantenimiento
                      <Badge variant="secondary" className="ml-1 text-xs font-normal">
                        {result.activities.length} ítems
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <SortableHeader label="Actividad" sortKey="activity" currentSort={sort} onSort={handleSort} />
                            <TableHead className="min-w-[220px]">Descripción</TableHead>
                            <SortableHeader label="Horas MO" sortKey="laborHours" currentSort={sort} onSort={handleSort} />
                            <SortableHeader label="Repuestos (COP)" sortKey="parts" currentSort={sort} onSort={handleSort} />
                            <SortableHeader label="Consumibles (COP)" sortKey="consumables" currentSort={sort} onSort={handleSort} />
                            <SortableHeader label="Subtotal (COP)" sortKey="subtotal" currentSort={sort} onSort={handleSort} />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedActivities.map((act, idx) => (
                            <motion.tr
                              key={act.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04, duration: 0.25 }}
                              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="font-medium text-sm whitespace-nowrap">
                                {act.activity}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {act.description}
                              </TableCell>
                              <TableCell className="text-sm tabular-nums">
                                {act.laborHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-sm tabular-nums whitespace-nowrap">
                                {formatCOP(act.parts)}
                              </TableCell>
                              <TableCell className="text-sm tabular-nums whitespace-nowrap">
                                {formatCOP(act.consumables)}
                              </TableCell>
                              <TableCell className="text-sm tabular-nums font-semibold whitespace-nowrap">
                                {formatCOP(act.subtotal)}
                              </TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom Tabs */}
                <Card>
                  <CardContent className="p-4">
                    <Tabs defaultValue="consumables">
                      <TabsList className="mb-4">
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

                      {/* Consumables Tab */}
                      <TabsContent value="consumables" className="mt-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead>Ítem</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Precio Unitario</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.consumables.map((c, i) => (
                                <TableRow key={i} className="hover:bg-muted/20 transition-colors">
                                  <TableCell className="font-medium text-sm">{c.item}</TableCell>
                                  <TableCell className="text-sm text-right tabular-nums">{c.quantity}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{c.unit}</TableCell>
                                  <TableCell className="text-sm text-right tabular-nums whitespace-nowrap">{formatCOP(c.unitPrice)}</TableCell>
                                  <TableCell className="text-sm text-right tabular-nums font-semibold whitespace-nowrap">{formatCOP(c.total)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/30 border-t-2 border-border">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                  Total Consumibles
                                </TableCell>
                                <TableCell className="text-right font-bold text-sm tabular-nums whitespace-nowrap">
                                  {formatCOP(result.costs.consumables)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      {/* Parts Tab */}
                      <TabsContent value="parts" className="mt-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="whitespace-nowrap">Código SAP</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Precio Unitario</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.parts.map((p, i) => (
                                <TableRow key={i} className="hover:bg-muted/20 transition-colors">
                                  <TableCell>
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                      {p.sapCode}
                                    </code>
                                  </TableCell>
                                  <TableCell className="font-medium text-sm">{p.description}</TableCell>
                                  <TableCell className="text-sm text-right tabular-nums">{p.quantity}</TableCell>
                                  <TableCell className="text-sm text-right tabular-nums whitespace-nowrap">{formatCOP(p.unitPrice)}</TableCell>
                                  <TableCell className="text-sm text-right tabular-nums font-semibold whitespace-nowrap">{formatCOP(p.total)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/30 border-t-2 border-border">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                  Total Repuestos
                                </TableCell>
                                <TableCell className="text-right font-bold text-sm tabular-nums whitespace-nowrap">
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
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── RIGHT PANEL ── */}
      <motion.aside
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        className="w-[300px] flex-shrink-0 border-l border-border bg-card overflow-y-auto scrollbar-thin"
      >
        <div className="p-5">
          <AnimatePresence mode="wait">
            {isCalculating ? (
              <motion.div
                key="summary-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonSummary />
              </motion.div>
            ) : result ? (
              <motion.div
                key="summary-result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <Card>
                  <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#cf1b22]" />
                      Resumen de Costos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-0">
                    {/* Line items */}
                    <div className="space-y-2.5 mb-4">
                      {[
                        { label: "Mano de Obra", value: result.costs.labor },
                        { label: "Consumibles", value: result.costs.consumables },
                        { label: "Repuestos", value: result.costs.parts },
                        { label: "Viaje", value: result.costs.travel },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{label}</span>
                          <span className="text-sm tabular-nums font-medium">
                            {formatCOP(value)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-2.5 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Subtotal</span>
                        <span className="text-sm tabular-nums font-semibold">
                          {formatCOP(result.costs.subtotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">IVA (19%)</span>
                        <span className="text-sm tabular-nums font-semibold">
                          {formatCOP(result.costs.vat)}
                        </span>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Total */}
                    <motion.div
                      initial={{ scale: 0.97 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 18 }}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#cf1b22]/5 border border-[#cf1b22]/20 mb-5"
                    >
                      <span className="text-sm font-bold text-[#cf1b22] uppercase tracking-wide">
                        TOTAL
                      </span>
                      <span className="text-base font-extrabold text-[#cf1b22] tabular-nums">
                        {formatCOP(result.costs.total)}
                      </span>
                    </motion.div>

                    {/* CTA Buttons */}
                    <div className="space-y-2">
                      <Button
                        className="w-full h-9 text-sm font-semibold bg-[#cf1b22] hover:bg-[#a51519] text-white"
                        onClick={() => {}}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Generar PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-9 text-sm border-[#cf1b22]/30 text-[#cf1b22] hover:bg-[#cf1b22]/5"
                        onClick={() => {}}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Cotización
                      </Button>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-4 pt-3 border-t border-border/60">
                      * Precios en Pesos Colombianos (COP) incluyendo IVA al 19%.
                      Las estimaciones son indicativas; la factura final puede variar según
                      disponibilidad de repuestos, condiciones de campo y logística.
                      Válido por 30 días desde la fecha de generación.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="summary-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[300px] text-center px-4"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Resumen de Costos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aparecerá después del cálculo
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  );
}
