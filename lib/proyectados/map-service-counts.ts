import type { TelemetriaOpportunityRow } from '@/lib/proyectados/map-telemetria-ui';
import { hasValidMapCoordinates } from '@/lib/proyectados/map-telemetria-ui';
import {
  resolveSiteLabel,
  resolveZoneFromLocation,
  toCanonicalDepartment,
} from '@/lib/proyectados/department-mapping';

export type MapCounts = { open: number; closed: number };

export interface TelemetriaMapEntry {
  id: string;
  zone: string;
  site: string;
  technician: string;
  /** open = vencido (ámbar); closed = programado (verde). */
  isOpen: boolean;
  equipment: string;
  serie: string;
  client: string;
  brand: string;
  model: string;
  nextDue: string;
  status: TelemetriaOpportunityRow['status'];
  latitud: number | null;
  longitud: number | null;
}

/** Punto preciso [lng, lat] para react-simple-maps. */
export interface MapGpsMarker {
  id: string;
  site: string;
  department: string;
  coordinates: [number, number];
  isOpen: boolean;
  label: string;
}

/** Agregado por sitio con GPS promedio cuando existe. */
export interface SiteLocationAggregate {
  site: string;
  department: string;
  counts: MapCounts;
  /** Promedio de lat/lng de registros con GPS; null si ninguno. */
  avgCoordinates: [number, number] | null;
}

export function mapRowsToMapEntries(
  rows: ReadonlyArray<TelemetriaOpportunityRow>
): TelemetriaMapEntry[] {
  return rows.map((r) => ({
    id: r.id,
    zone: resolveZoneFromLocation(r.sede, r.ciudad),
    site: resolveSiteLabel(r.sede, r.ciudad),
    technician: r.advisor?.trim() || 'Sin asesor',
    isOpen: r.status === 'Overdue',
    equipment: r.equipment,
    serie: r.serie,
    client: r.client,
    brand: r.brand,
    model: r.model,
    nextDue: r.nextDue,
    status: r.status,
    latitud: r.latitud,
    longitud: r.longitud,
  }));
}

export function emptyCounts(): MapCounts {
  return { open: 0, closed: 0 };
}

function bump(counts: MapCounts, isOpen: boolean): void {
  if (isOpen) counts.open += 1;
  else counts.closed += 1;
}

export function buildServicesByDepartment(
  entries: ReadonlyArray<TelemetriaMapEntry>
): Record<string, MapCounts> {
  const map: Record<string, MapCounts> = {};
  for (const e of entries) {
    const zone = toCanonicalDepartment(e.zone);
    if (!map[zone]) map[zone] = emptyCounts();
    bump(map[zone], e.isOpen);
  }
  return map;
}

export function buildServicesByDepartmentMunicipality(
  entries: ReadonlyArray<TelemetriaMapEntry>
): Record<string, Record<string, MapCounts>> {
  const map: Record<string, Record<string, MapCounts>> = {};
  for (const e of entries) {
    const zone = toCanonicalDepartment(e.zone);
    const site = e.site || 'Sin sitio';
    if (!map[zone]) map[zone] = {};
    if (!map[zone][site]) map[zone][site] = emptyCounts();
    bump(map[zone][site], e.isOpen);
  }
  return map;
}

/** Agrega por zona+sitio y calcula centro GPS promedio de telemetría. */
export function buildSiteLocationAggregates(
  entries: ReadonlyArray<TelemetriaMapEntry>
): SiteLocationAggregate[] {
  type Acc = {
    site: string;
    department: string;
    counts: MapCounts;
    latSum: number;
    lngSum: number;
    geoCount: number;
  };
  const map = new Map<string, Acc>();

  for (const e of entries) {
    const department = toCanonicalDepartment(e.zone);
    const site = e.site || 'Sin sitio';
    const key = `${department}::${site}`;
    const prev =
      map.get(key) ??
      ({
        site,
        department,
        counts: emptyCounts(),
        latSum: 0,
        lngSum: 0,
        geoCount: 0,
      } satisfies Acc);
    bump(prev.counts, e.isOpen);
    if (
      hasValidMapCoordinates(e.latitud, e.longitud) &&
      e.latitud != null &&
      e.longitud != null
    ) {
      prev.latSum += e.latitud;
      prev.lngSum += e.longitud;
      prev.geoCount += 1;
    }
    map.set(key, prev);
  }

  return Array.from(map.values()).map((v) => ({
    site: v.site,
    department: v.department,
    counts: v.counts,
    avgCoordinates:
      v.geoCount > 0
        ? ([v.lngSum / v.geoCount, v.latSum / v.geoCount] as [number, number])
        : null,
  }));
}

/** Un marcador por registro con lat/lng válidos (ubicación precisa). */
export function buildGpsMarkersFromEntries(
  entries: ReadonlyArray<TelemetriaMapEntry>
): MapGpsMarker[] {
  const points: MapGpsMarker[] = [];
  for (const e of entries) {
    if (
      !hasValidMapCoordinates(e.latitud, e.longitud) ||
      e.latitud == null ||
      e.longitud == null
    ) {
      continue;
    }
    points.push({
      id: e.id,
      site: e.site || 'Sin sitio',
      department: toCanonicalDepartment(e.zone),
      coordinates: [e.longitud, e.latitud],
      isOpen: e.isOpen,
      label: `${e.equipment} · ${e.serie}`,
    });
  }
  return points;
}

export function filterVistaDetalleEntries(
  entries: ReadonlyArray<TelemetriaMapEntry>,
  zones: readonly string[],
  sites: readonly string[],
  technicians: readonly string[]
): TelemetriaMapEntry[] {
  return entries.filter((e) => {
    if (zones.length > 0) {
      const zone = toCanonicalDepartment(e.zone);
      if (!zones.includes(zone)) return false;
    }
    if (sites.length > 0) {
      const site = e.site || 'Sin sitio';
      if (!sites.includes(site)) return false;
    }
    if (technicians.length > 0) {
      if (!technicians.includes(e.technician)) return false;
    }
    return true;
  });
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'es'));
}
