import type { TelemetriaEquipo } from '@/types/database';

export type MaintenanceStatusUi = 'Scheduled' | 'Overdue' | 'In Progress' | 'Completed';

export interface TelemetriaOpportunityRow {
  id: string;
  equipment: string;
  brand: string;
  model: string;
  client: string;
  hours: number;
  /** Última fecha/hora de común = descarga desde app de telemetría. */
  lastMaintenance: string;
  /** Solo Fecha Primer Mtto (proyección vigente). */
  nextDue: string;
  status: MaintenanceStatusUi;
  advisor: string;
  serie: string;
  sede: string;
  ciudad: string;
  mesCreado: string;
  anio: number | null;
  /** ISO de Fecha Primer Mtto. */
  fechaIso: string | null;
  createdAt: string | null;
}

export interface TelemetriaCalendarEvent {
  id: string;
  day: number;
  month: number;
  year: number;
  title: string;
  status: MaintenanceStatusUi;
  serie: string;
  sede: string;
  client: string;
  advisor: string;
}

function formatDateEs(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO');
}

function startOfLocalDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Solo Fecha Primer Mtto define la proyección de mantenimiento. */
export function pickFechaPrimerMtto(row: TelemetriaEquipo): string | null {
  const raw = row.fecha_primer_mtto;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return raw.slice(0, 10);
}

/**
 * Programado: Fecha Primer Mtto >= hoy.
 * Vencido: sin fecha o Fecha Primer Mtto < hoy.
 * (vencidos = total − programados)
 */
export function statusFromFechaPrimerMtto(
  fechaPrimerIso: string | null
): MaintenanceStatusUi {
  if (!fechaPrimerIso) return 'Overdue';
  const due = startOfLocalDay(new Date(fechaPrimerIso));
  if (Number.isNaN(due.getTime())) return 'Overdue';
  const today = startOfLocalDay(new Date());
  return due >= today ? 'Scheduled' : 'Overdue';
}

export function isProgramadoPorPrimerMtto(fechaPrimerIso: string | null): boolean {
  return statusFromFechaPrimerMtto(fechaPrimerIso) === 'Scheduled';
}

function fechaSortKey(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * Oportunidades Próximas:
 * 1) Programadas (Fecha 1er Mtto ≥ hoy) de la más próxima a la más lejana
 * 2) Vencidas de la más reciente a la más antigua
 */
export function sortOportunidadesProximas<T extends Pick<TelemetriaOpportunityRow, 'status' | 'fechaIso'>>(
  rows: T[]
): T[] {
  const statusRank = (status: MaintenanceStatusUi): number => {
    if (status === 'Scheduled') return 0;
    if (status === 'Overdue') return 1;
    return 2;
  };

  return [...rows].sort((a, b) => {
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;

    const aKey = fechaSortKey(a.fechaIso);
    const bKey = fechaSortKey(b.fechaIso);

    if (a.status === 'Scheduled') {
      return aKey - bKey;
    }
    if (a.status === 'Overdue') {
      const aPast = aKey === Number.POSITIVE_INFINITY ? Number.NEGATIVE_INFINITY : aKey;
      const bPast = bKey === Number.POSITIVE_INFINITY ? Number.NEGATIVE_INFINITY : bKey;
      return bPast - aPast;
    }
    return aKey - bKey;
  });
}

/** Filas de oportunidades: únicamente Fecha Primer Mtto. */
export function mapTelemetriaToOpportunityRows(
  equipos: TelemetriaEquipo[]
): TelemetriaOpportunityRow[] {
  return equipos.map((e) => {
    const fechaPrimer = pickFechaPrimerMtto(e);
    return {
      id: e.id,
      equipment: `${e.marca} ${e.modelo}`.trim(),
      brand: e.marca,
      model: e.modelo,
      client: e.titulo?.trim() || 'Sin cliente',
      hours: Math.round(Number(e.horometro) || 0),
      lastMaintenance: formatDateEs(e.ultima_fecha_comunicacion),
      nextDue: formatDateEs(fechaPrimer),
      status: statusFromFechaPrimerMtto(fechaPrimer),
      advisor: e.asesor_email?.trim() || 'Sin asesor',
      serie: e.serie,
      sede: e.sede?.trim() || '—',
      ciudad: e.ciudad?.trim() || '—',
      mesCreado: e.mes_creado?.trim() || '—',
      anio: e.anio ?? null,
      fechaIso: fechaPrimer,
      createdAt: e.created_at ?? null,
    };
  });
}

/** Calendario: solo Fecha Primer Mtto. */
export function mapTelemetriaToCalendarEvents(
  equipos: TelemetriaEquipo[]
): TelemetriaCalendarEvent[] {
  const events: TelemetriaCalendarEvent[] = [];

  for (const e of equipos) {
    const iso = pickFechaPrimerMtto(e);
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    events.push({
      id: `${e.id}-primer`,
      day: d.getUTCDate(),
      month: d.getUTCMonth(),
      year: d.getUTCFullYear(),
      title: `${e.marca} ${e.modelo} – 1er mtto`,
      status: statusFromFechaPrimerMtto(iso),
      serie: e.serie?.trim() || '—',
      sede: e.sede?.trim() || e.ciudad?.trim() || '—',
      client: e.titulo?.trim() || 'Sin cliente',
      advisor: e.asesor_email?.trim() || 'Sin asesor',
    });
  }

  return events;
}

export interface CiudadAgg {
  name: string;
  count: number;
  status: 'active' | 'warning' | 'critical';
  marcas: string[];
  modelos: string[];
  series: string[];
  avgLat: number | null;
  avgLng: number | null;
}

/** Agrega por ciudad/sede para el mapa (estado por Fecha Primer Mtto). */
export function aggregateCiudadesFromTelemetria(equipos: TelemetriaEquipo[]): CiudadAgg[] {
  const map = new Map<
    string,
    {
      count: number;
      overdue: number;
      marcas: Set<string>;
      modelos: Set<string>;
      series: Set<string>;
      latSum: number;
      lngSum: number;
      geoCount: number;
    }
  >();

  for (const e of equipos) {
    const raw = (e.sede || e.ciudad || 'Sin ubicación').split(',')[0]?.trim() || 'Sin ubicación';
    const prev = map.get(raw) ?? {
      count: 0,
      overdue: 0,
      marcas: new Set<string>(),
      modelos: new Set<string>(),
      series: new Set<string>(),
      latSum: 0,
      lngSum: 0,
      geoCount: 0,
    };
    prev.count += 1;
    if (e.marca?.trim()) prev.marcas.add(e.marca.trim());
    if (e.modelo?.trim()) prev.modelos.add(e.modelo.trim());
    if (e.serie?.trim()) prev.series.add(e.serie.trim());
    const lat = e.latitud == null ? null : Number(e.latitud);
    const lng = e.longitud == null ? null : Number(e.longitud);
    if (
      lat != null &&
      lng != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -5 &&
      lat <= 14 &&
      lng >= -80 &&
      lng <= -66
    ) {
      prev.latSum += lat;
      prev.lngSum += lng;
      prev.geoCount += 1;
    }
    const primer = pickFechaPrimerMtto(e);
    if (statusFromFechaPrimerMtto(primer) === 'Overdue') prev.overdue += 1;
    map.set(raw, prev);
  }

  return Array.from(map.entries())
    .map(([name, v]) => {
      let status: CiudadAgg['status'] = 'active';
      if (v.overdue / v.count > 0.35) status = 'critical';
      else if (v.overdue > 0) status = 'warning';
      return {
        name,
        count: v.count,
        status,
        marcas: Array.from(v.marcas).sort((a, b) => a.localeCompare(b, 'es')),
        modelos: Array.from(v.modelos).sort((a, b) => a.localeCompare(b, 'es')),
        series: Array.from(v.series).sort((a, b) => a.localeCompare(b, 'es')),
        avgLat: v.geoCount > 0 ? v.latSum / v.geoCount : null,
        avgLng: v.geoCount > 0 ? v.lngSum / v.geoCount : null,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export interface BrandPieSlice {
  name: string;
  value: number;
  color: string;
}

const PIE_COLORS = ['#cf1b22', '#50504f', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

export function aggregateMarcasPie(equipos: TelemetriaEquipo[]): BrandPieSlice[] {
  const map = new Map<string, number>();
  for (const e of equipos) {
    const m = e.marca || 'Sin marca';
    map.set(m, (map.get(m) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value], i) => ({
      name,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
}

/** Etiqueta de sede para gráficos: sede → ciudad → Sin sede. */
export function resolveSedeChartLabel(
  row: Pick<TelemetriaOpportunityRow, 'sede' | 'ciudad'>
): string {
  const sede = row.sede?.trim();
  if (sede && sede !== '—') return sede;
  const ciudad = row.ciudad?.trim();
  if (ciudad && ciudad !== '—') return ciudad;
  return 'Sin sede';
}

export interface SedeChartItem {
  sede: string;
  total: number;
}

/** Agrega oportunidades por sede sin truncar el listado. */
export function aggregateOportunidadesPorSede(
  rows: ReadonlyArray<Pick<TelemetriaOpportunityRow, 'sede' | 'ciudad'>>
): SedeChartItem[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const label = resolveSedeChartLabel(r);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([sede, total]) => ({ sede, total }))
    .sort((a, b) => b.total - a.total);
}

export const SEDE_CHART_ROW_HEIGHT = 36;
export const SEDE_CHART_MIN_HEIGHT = 240;
export const SEDE_CHART_Y_AXIS_WIDTH = 200;
export const CLIENT_CHART_Y_AXIS_WIDTH = 220;

export function sedeChartHeight(itemCount: number): number {
  if (itemCount <= 0) return SEDE_CHART_MIN_HEIGHT;
  return Math.max(SEDE_CHART_MIN_HEIGHT, itemCount * SEDE_CHART_ROW_HEIGHT);
}

export interface ClienteChartItem {
  cliente: string;
  total: number;
}

/** Agrega oportunidades por cliente sin truncar el listado. */
export function aggregateOportunidadesPorCliente(
  rows: ReadonlyArray<Pick<TelemetriaOpportunityRow, 'client'>>
): ClienteChartItem[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const cliente = r.client?.trim() || 'Sin cliente';
    map.set(cliente, (map.get(cliente) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([cliente, total]) => ({ cliente, total }))
    .sort((a, b) => b.total - a.total);
}
