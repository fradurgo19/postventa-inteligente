/**
 * Proyección lat/lng → viewBox del SVG oficial Colombia (0 0 613 694).
 * Ajuste lineal calibrado con ciudades ancla (Bogotá, Medellín, Cali, etc.).
 */

export const COLOMBIA_MAP_VIEWBOX = { width: 613, height: 694 } as const;

/** cx = LNG_A * lng + LNG_B */
const LNG_A = 37.96155069189996;
const LNG_B = 3127.811462044035;
/** cy = LAT_A * lat + LAT_B */
const LAT_A = -41.04351637509167;
const LAT_B = 534.2985429448697;

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Coordenadas geográficas de sedes/ciudades conocidas (Partequipos + principales). */
export const CITY_GEO: Record<string, GeoPoint> = {
  bogota: { lat: 4.711, lng: -74.072 },
  medellin: { lat: 6.244, lng: -75.581 },
  cali: { lat: 3.452, lng: -76.532 },
  barranquilla: { lat: 10.968, lng: -74.781 },
  cartagena: { lat: 10.391, lng: -75.479 },
  bucaramanga: { lat: 7.119, lng: -73.123 },
  monteria: { lat: 8.748, lng: -75.882 },
  cucuta: { lat: 7.894, lng: -72.508 },
  pereira: { lat: 4.813, lng: -75.696 },
  manizales: { lat: 5.068, lng: -75.517 },
  armenia: { lat: 4.533, lng: -75.681 },
  ibague: { lat: 4.439, lng: -75.232 },
  neiva: { lat: 2.927, lng: -75.289 },
  pasto: { lat: 1.213, lng: -77.281 },
  popayan: { lat: 2.444, lng: -76.606 },
  villavicencio: { lat: 4.142, lng: -73.627 },
  yopal: { lat: 5.339, lng: -72.396 },
  tunja: { lat: 5.535, lng: -73.368 },
  santamarta: { lat: 11.24, lng: -74.201 },
  valledupar: { lat: 10.463, lng: -73.253 },
  sincelejo: { lat: 9.305, lng: -75.398 },
  quibdo: { lat: 5.692, lng: -76.658 },
  istmina: { lat: 5.16, lng: -76.686 },
  buenaventura: { lat: 3.88, lng: -77.031 },
};

export function normalizeCityKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}

export function projectColombia(lat: number, lng: number): { cx: number; cy: number } {
  const cx = LNG_A * lng + LNG_B;
  const cy = LAT_A * lat + LAT_B;
  return {
    cx: Math.min(COLOMBIA_MAP_VIEWBOX.width - 8, Math.max(8, cx)),
    cy: Math.min(COLOMBIA_MAP_VIEWBOX.height - 8, Math.max(8, cy)),
  };
}

export function resolveCityGeo(name: string): GeoPoint | null {
  const key = normalizeCityKey(name);
  if (CITY_GEO[key]) return CITY_GEO[key];

  const aliases: Array<[string, keyof typeof CITY_GEO]> = [
    ['bogota', 'bogota'],
    ['medellin', 'medellin'],
    ['barranquilla', 'barranquilla'],
    ['monteria', 'monteria'],
    ['bucaramanga', 'bucaramanga'],
    ['ibague', 'ibague'],
    ['istmina', 'istmina'],
    ['cali', 'cali'],
    ['cartagena', 'cartagena'],
    ['cucuta', 'cucuta'],
    ['pereira', 'pereira'],
    ['manizales', 'manizales'],
    ['armenia', 'armenia'],
    ['neiva', 'neiva'],
    ['pasto', 'pasto'],
    ['popayan', 'popayan'],
    ['villavicencio', 'villavicencio'],
    ['santamarta', 'santamarta'],
    ['valledupar', 'valledupar'],
    ['sincelejo', 'sincelejo'],
    ['quibdo', 'quibdo'],
    ['buenaventura', 'buenaventura'],
    ['yopal', 'yopal'],
    ['tunja', 'tunja'],
  ];

  for (const [needle, geoKey] of aliases) {
    if (key.includes(needle)) return CITY_GEO[geoKey];
  }
  return null;
}

export function mapPointForSede(
  name: string,
  avgLat: number | null,
  avgLng: number | null,
  fallbackIndex: number
): { cx: number; cy: number } {
  if (
    avgLat != null &&
    avgLng != null &&
    Number.isFinite(avgLat) &&
    Number.isFinite(avgLng) &&
    avgLat >= -5 &&
    avgLat <= 14 &&
    avgLng >= -80 &&
    avgLng <= -66
  ) {
    return projectColombia(avgLat, avgLng);
  }

  const geo = resolveCityGeo(name);
  if (geo) return projectColombia(geo.lat, geo.lng);

  // Sin GPS ni nombre conocido: ancla cerca del centro andino
  const ring = Math.floor(fallbackIndex / 5);
  const slot = fallbackIndex % 5;
  return {
    cx: 280 + slot * 18,
    cy: 320 + ring * 24,
  };
}
