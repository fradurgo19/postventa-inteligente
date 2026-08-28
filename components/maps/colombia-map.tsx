'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { geoNameToZona, toCanonicalDepartment } from '@/lib/proyectados/department-mapping';
import type { MapCounts } from '@/lib/proyectados/map-service-counts';

type GeoProps = {
  NOMBRE_DPT?: string;
  NOMBRE_MPI?: string;
};

type GeoFeature = Feature<Geometry, GeoProps>;

export interface ColombiaMapProps {
  readonly servicesByDepartment: Record<string, MapCounts>;
  readonly servicesByMunicipality?: Record<string, MapCounts>;
  readonly servicesByDepartmentMunicipality?: Record<
    string,
    Record<string, MapCounts>
  >;
  readonly selectedDepartment?: string | null;
  readonly onDepartmentSelect?: (department: string | null) => void;
  readonly selectedDepartments?: string[];
  readonly onDepartmentsChange?: (departments: string[]) => void;
  readonly selectedSites?: string[];
  readonly onMunicipalityClick?: (siteName: string, department: string) => void;
  readonly showZoomControls?: boolean;
  readonly className?: string;
}

interface SiteMarker {
  key: string;
  site: string;
  department: string;
  coordinates: [number, number];
  total: number;
  highlighted: boolean;
}

const DEPTO_URL = '/depto.json';
const MPIO_URL = '/mpio.json';

function totalCounts(c?: MapCounts): number {
  if (!c) return 0;
  return c.open + c.closed;
}

function departmentFill(counts: MapCounts | undefined, selected: boolean): string {
  if (!counts) return selected ? '#e2e8f0' : '#f1f5f9';
  const total = totalCounts(counts);
  if (total === 0) return selected ? '#e2e8f0' : '#f1f5f9';
  const openRatio = counts.open / total;
  const intensity = Math.min(1, 0.35 + total / 20);
  // Ámbar (open/vencido) ↔ verde (closed/programado) según proporción
  const r = Math.round(245 * openRatio + 16 * (1 - openRatio));
  const g = Math.round(158 * openRatio + 185 * (1 - openRatio));
  const b = Math.round(11 * openRatio + 129 * (1 - openRatio));
  const alpha = selected ? Math.min(0.95, intensity + 0.15) : intensity;
  return `rgba(${r},${g},${b},${alpha})`;
}

function isMultiMode(props: ColombiaMapProps): boolean {
  return typeof props.onDepartmentsChange === 'function';
}

export function ColombiaMap(props: ColombiaMapProps) {
  const {
    servicesByDepartment,
    servicesByDepartmentMunicipality,
    selectedDepartment = null,
    onDepartmentSelect,
    selectedDepartments = [],
    onDepartmentsChange,
    selectedSites = [],
    onMunicipalityClick,
    showZoomControls = false,
    className,
  } = props;

  const multi = isMultiMode(props);
  const [deptoGeo, setDeptoGeo] = useState<FeatureCollection | null>(null);
  const [mpioGeo, setMpioGeo] = useState<FeatureCollection | null>(null);
  const [position, setPosition] = useState({ coordinates: [-74.3, 4.2] as [number, number], zoom: 1 });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(DEPTO_URL).then((r) => r.json() as Promise<FeatureCollection>),
      fetch(MPIO_URL).then((r) => r.json() as Promise<FeatureCollection>),
    ])
      .then(([d, m]) => {
        if (cancelled) return;
        setDeptoGeo(d);
        setMpioGeo(m);
      })
      .catch(() => {
        if (!cancelled) {
          setDeptoGeo(null);
          setMpioGeo(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSet = useMemo(() => {
    if (multi) return new Set(selectedDepartments.map((z) => toCanonicalDepartment(z)));
    if (selectedDepartment) return new Set([toCanonicalDepartment(selectedDepartment)]);
    return new Set<string>();
  }, [multi, selectedDepartments, selectedDepartment]);

  const selectedSitesSet = useMemo(() => new Set(selectedSites), [selectedSites]);

  const centroidByDepartment = useMemo(() => {
    const map = new Map<string, [number, number]>();
    if (!deptoGeo) return map;
    for (const f of deptoGeo.features as GeoFeature[]) {
      const zona = geoNameToZona(String(f.properties?.NOMBRE_DPT ?? ''));
      try {
        const c = geoCentroid(f);
        if (Number.isFinite(c[0]) && Number.isFinite(c[1])) {
          map.set(zona, [c[0], c[1]]);
        }
      } catch {
        // ignore invalid geometry
      }
    }
    return map;
  }, [deptoGeo]);

  const markers: SiteMarker[] = useMemo(() => {
    if (!mpioGeo || selectedSet.size === 0 || !servicesByDepartmentMunicipality) {
      return [];
    }

    const byDeptMpio = new Map<string, Map<string, [number, number]>>();
    for (const f of mpioGeo.features as GeoFeature[]) {
      const zona = geoNameToZona(String(f.properties?.NOMBRE_DPT ?? ''));
      if (!selectedSet.has(zona)) continue;
      const mpi = String(f.properties?.NOMBRE_MPI ?? '').trim();
      if (!mpi) continue;
      try {
        const c = geoCentroid(f);
        if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
        if (!byDeptMpio.has(zona)) byDeptMpio.set(zona, new Map());
        byDeptMpio.get(zona)!.set(mpi.toUpperCase(), [c[0], c[1]]);
      } catch {
        // skip
      }
    }

    const result: SiteMarker[] = [];
    for (const department of Array.from(selectedSet)) {
      const sites = servicesByDepartmentMunicipality[department];
      if (!sites) continue;
      const mpiMap = byDeptMpio.get(department);
      const deptCenter = centroidByDepartment.get(department) ?? ([-74.3, 4.2] as [number, number]);
      let orphanIndex = 0;

      for (const [site, counts] of Object.entries(sites)) {
        const total = totalCounts(counts);
        if (total <= 0) continue;
        const geo =
          mpiMap?.get(site.toUpperCase()) ??
          mpiMap?.get(site.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase());

        let coordinates: [number, number];
        if (geo) {
          coordinates = geo;
        } else {
          const offset = (orphanIndex % 5) * 0.12;
          const ring = Math.floor(orphanIndex / 5) * 0.1;
          coordinates = [deptCenter[0] + offset, deptCenter[1] + ring];
          orphanIndex += 1;
        }

        result.push({
          key: `${department}::${site}`,
          site,
          department,
          coordinates,
          total,
          highlighted: selectedSitesSet.has(site),
        });
      }
    }
    return result;
  }, [
    mpioGeo,
    selectedSet,
    servicesByDepartmentMunicipality,
    centroidByDepartment,
    selectedSitesSet,
  ]);

  useEffect(() => {
    if (selectedSet.size !== 1) return;
    const only = Array.from(selectedSet)[0];
    const center = centroidByDepartment.get(only);
    if (!center) return;
    setPosition((prev) => ({ ...prev, coordinates: center, zoom: Math.max(prev.zoom, 2.2) }));
  }, [selectedSet, centroidByDepartment]);

  const handleDepartmentClick = useCallback(
    (zona: string) => {
      if (multi && onDepartmentsChange) {
        const next = selectedSet.has(zona)
          ? selectedDepartments.filter((d) => toCanonicalDepartment(d) !== zona)
          : [...selectedDepartments, zona];
        onDepartmentsChange(next);
        return;
      }
      if (!onDepartmentSelect) return;
      onDepartmentSelect(selectedDepartment === zona ? null : zona);
    },
    [
      multi,
      onDepartmentsChange,
      selectedSet,
      selectedDepartments,
      onDepartmentSelect,
      selectedDepartment,
    ]
  );

  const handleZoomIn = () =>
    setPosition((pos) => ({ ...pos, zoom: Math.min(pos.zoom * 1.35, 8) }));
  const handleZoomOut = () =>
    setPosition((pos) => ({ ...pos, zoom: Math.max(pos.zoom / 1.35, 1) }));

  return (
    <div className={cn('relative w-full rounded-md border border-border bg-slate-50 overflow-hidden', className)}>
      {showZoomControls ? (
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
          <Button type="button" size="icon" variant="outline" className="h-7 w-7 bg-white" onClick={handleZoomIn} aria-label="Acercar">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-7 w-7 bg-white" onClick={handleZoomOut} aria-label="Alejar">
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      {!deptoGeo ? (
        <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
          Cargando mapa…
        </div>
      ) : (
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 1600, center: [-74.3, 4.2] }}
          width={800}
          height={520}
          style={{ width: '100%', height: 'auto' }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={(pos) =>
              setPosition({
                coordinates: pos.coordinates as [number, number],
                zoom: pos.zoom,
              })
            }
          >
            <Geographies geography={deptoGeo}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const rawName = String(geo.properties?.NOMBRE_DPT ?? '');
                  const zona = geoNameToZona(rawName);
                  const counts = servicesByDepartment[zona];
                  const selected = selectedSet.has(zona);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        handleDepartmentClick(zona);
                      }}
                      style={{
                        default: {
                          fill: departmentFill(counts, selected),
                          stroke: selected ? '#cf1b22' : '#94a3b8',
                          strokeWidth: selected ? 1.2 : 0.5,
                          outline: 'none',
                          cursor: 'pointer',
                        },
                        hover: {
                          fill: departmentFill(counts, true),
                          stroke: '#cf1b22',
                          strokeWidth: 1,
                          outline: 'none',
                          cursor: 'pointer',
                        },
                        pressed: {
                          fill: departmentFill(counts, true),
                          stroke: '#9f1239',
                          strokeWidth: 1.2,
                          outline: 'none',
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {markers.map((m) => {
              const r = Math.min(14, 5 + Math.sqrt(m.total) * 2.2);
              return (
                <Marker key={m.key} coordinates={m.coordinates}>
                  <circle
                    r={r}
                    fill={m.highlighted ? '#1d4ed8' : '#3b82f6'}
                    stroke="#fff"
                    strokeWidth={1.5}
                    opacity={0.92}
                    style={{ cursor: 'pointer' }}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      onMunicipalityClick?.(m.site, m.department);
                    }}
                  />
                  <text
                    textAnchor="middle"
                    y={4}
                    style={{
                      fontFamily: 'system-ui',
                      fontSize: 9,
                      fontWeight: 700,
                      fill: '#fff',
                      pointerEvents: 'none',
                    }}
                  >
                    {m.total > 99 ? '99+' : m.total}
                  </text>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      )}

      <div className="absolute bottom-2 left-2 rounded-md bg-white/90 border border-border px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
        Ámbar: vencidos · Verde: programados · Azul: sitios
      </div>
    </div>
  );
}
