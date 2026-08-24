import type { TelemetriaEquipo } from '@/types/database';

export type MaintenanceStatusUi = 'Scheduled' | 'Overdue' | 'In Progress' | 'Completed';

export interface TelemetriaOpportunityRow {
  id: string;
  equipment: string;
  brand: string;
  model: string;
  client: string;
  hours: number;
  lastMaintenance: string;
  nextDue: string;
  status: MaintenanceStatusUi;
  advisor: string;
  serie: string;
  sede: string;
  ciudad: string;
  mesCreado: string;
  anio: number | null;
  fechaIso: string | null;
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

function mapEstadoToUi(estado: string | null | undefined, nextDueIso: string | null): MaintenanceStatusUi {
  const e = (estado ?? '').toLowerCase().trim();
  if (e.includes('complet') || e.includes('cerrad')) return 'Completed';
  if (e.includes('progreso') || e.includes('proceso') || e.includes('curso')) return 'In Progress';
  if (e.includes('vencid') || e.includes('overdue')) return 'Overdue';

  if (nextDueIso) {
    const due = new Date(nextDueIso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(due.getTime()) && due < today && !e.includes('enviad')) {
      return 'Overdue';
    }
  }

  if (e.includes('enviad')) return 'In Progress';
  return 'Scheduled';
}

function pickNextDue(row: TelemetriaEquipo): string | null {
  const dates = [row.fecha_primer_mtto, row.fecha_segundo_mtto, row.fecha_tercer_mtto]
    .filter((d): d is string => Boolean(d))
    .sort();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = dates.find((d) => d >= today);
  return upcoming ?? dates[0] ?? null;
}

/** Filas de oportunidades desde telemetría (carga masiva). */
export function mapTelemetriaToOpportunityRows(
  equipos: TelemetriaEquipo[]
): TelemetriaOpportunityRow[] {
  return equipos.map((e) => {
    const nextDueIso = pickNextDue(e);
    return {
      id: e.id,
      equipment: `${e.marca} ${e.modelo}`.trim(),
      brand: e.marca,
      model: e.modelo,
      client: e.titulo?.trim() || 'Sin cliente',
      hours: Math.round(Number(e.horometro) || 0),
      lastMaintenance: '—',
      nextDue: formatDateEs(nextDueIso),
      status: mapEstadoToUi(e.estado, nextDueIso),
      advisor: e.asesor_email?.trim() || 'Sin asesor',
      serie: e.serie,
      sede: e.sede?.trim() || '—',
      ciudad: e.ciudad?.trim() || '—',
      mesCreado: e.mes_creado?.trim() || '—',
      anio: e.anio ?? null,
      fechaIso: nextDueIso,
    };
  });
}

/** Eventos de calendario desde fechas de mtto en telemetría. */
export function mapTelemetriaToCalendarEvents(
  equipos: TelemetriaEquipo[]
): TelemetriaCalendarEvent[] {
  const events: TelemetriaCalendarEvent[] = [];

  for (const e of equipos) {
    const slots: Array<{ iso: string | null | undefined; label: string }> = [
      { iso: e.fecha_primer_mtto, label: '1er' },
      { iso: e.fecha_segundo_mtto, label: '2do' },
      { iso: e.fecha_tercer_mtto, label: '3er' },
    ];

    for (const slot of slots) {
      if (!slot.iso) continue;
      const d = new Date(slot.iso);
      if (Number.isNaN(d.getTime())) continue;
      const nextDueIso = pickNextDue(e);
      events.push({
        id: `${e.id}-${slot.label}`,
        day: d.getUTCDate(),
        month: d.getUTCMonth(),
        year: d.getUTCFullYear(),
        title: `${e.marca} ${e.modelo} – ${slot.label} mtto`,
        status: mapEstadoToUi(e.estado, nextDueIso),
      });
    }
  }

  return events;
}

export interface CiudadAgg {
  name: string;
  count: number;
  status: 'active' | 'warning' | 'critical';
}

/** Agrega por ciudad/sede para el mapa. */
export function aggregateCiudadesFromTelemetria(equipos: TelemetriaEquipo[]): CiudadAgg[] {
  const map = new Map<string, { count: number; overdue: number }>();

  for (const e of equipos) {
    const raw = (e.sede || e.ciudad || 'Sin ubicación').split(',')[0]?.trim() || 'Sin ubicación';
    const prev = map.get(raw) ?? { count: 0, overdue: 0 };
    prev.count += 1;
    const next = pickNextDue(e);
    if (mapEstadoToUi(e.estado, next) === 'Overdue') prev.overdue += 1;
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
