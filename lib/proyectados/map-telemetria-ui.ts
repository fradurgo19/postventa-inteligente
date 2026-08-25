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
    });
  }

  return events;
}

export interface CiudadAgg {
  name: string;
  count: number;
  status: 'active' | 'warning' | 'critical';
}

/** Agrega por ciudad/sede para el mapa (estado por Fecha Primer Mtto). */
export function aggregateCiudadesFromTelemetria(equipos: TelemetriaEquipo[]): CiudadAgg[] {
  const map = new Map<string, { count: number; overdue: number }>();

  for (const e of equipos) {
    const raw = (e.sede || e.ciudad || 'Sin ubicación').split(',')[0]?.trim() || 'Sin ubicación';
    const prev = map.get(raw) ?? { count: 0, overdue: 0 };
    prev.count += 1;
    const primer = pickFechaPrimerMtto(e);
    if (statusFromFechaPrimerMtto(primer) === 'Overdue') prev.overdue += 1;
    map.set(raw, prev);
  }

  return Array.from(map.entries())
    .map(([name, v]) => {
      let status: CiudadAgg['status'] = 'active';
      if (v.overdue / v.count > 0.35) status = 'critical';
      else if (v.overdue > 0) status = 'warning';
      return { name, count: v.count, status };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
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
