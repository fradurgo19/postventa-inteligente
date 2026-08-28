/**
 * Canonicalización de departamentos (zonas) Colombia ↔ GeoJSON NOMBRE_DPT.
 */

export function stripDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n');
}

export function normalizeKey(value: string): string {
  return stripDiacritics(value)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** GeoJSON NOMBRE_DPT (MAYÚSCULAS) → zona canónica de la app */
const GEO_NAME_TO_ZONA: Record<string, string> = {
  ANTIOQUIA: 'Antioquia',
  ATLANTICO: 'Atlántico',
  'SANTAFE DE BOGOTA D C': 'Bogotá D.C.',
  'SANTAFE DE BOGOTA D.C': 'Bogotá D.C.',
  'SANTA FE DE BOGOTA D C': 'Bogotá D.C.',
  BOGOTA: 'Bogotá D.C.',
  'BOGOTA D C': 'Bogotá D.C.',
  'BOGOTA D.C': 'Bogotá D.C.',
  BOLIVAR: 'Bolívar',
  BOYACA: 'Boyacá',
  CALDAS: 'Caldas',
  CAQUETA: 'Caquetá',
  CAUCA: 'Cauca',
  CESAR: 'Cesar',
  CORDOBA: 'Córdoba',
  CUNDINAMARCA: 'Cundinamarca',
  CHOCO: 'Chocó',
  HUILA: 'Huila',
  'LA GUAJIRA': 'La Guajira',
  MAGDALENA: 'Magdalena',
  META: 'Meta',
  NARINO: 'Nariño',
  'NARIÑO': 'Nariño',
  'NORTE DE SANTANDER': 'Norte de Santander',
  QUINDIO: 'Quindío',
  RISARALDA: 'Risaralda',
  SANTANDER: 'Santander',
  SUCRE: 'Sucre',
  TOLIMA: 'Tolima',
  'VALLE DEL CAUCA': 'Valle del Cauca',
  ARAUCA: 'Arauca',
  CASANARE: 'Casanare',
  PUTUMAYO: 'Putumayo',
  'ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA': 'San Andrés',
  'SAN ANDRES': 'San Andrés',
  AMAZONAS: 'Amazonas',
  GUAINIA: 'Guainía',
  GUAVIARE: 'Guaviare',
  VAUPES: 'Vaupés',
  VICHADA: 'Vichada',
};

/** Alias de negocio → zona canónica */
const BUSINESS_ALIAS_TO_ZONA: Record<string, string> = {
  ...GEO_NAME_TO_ZONA,
  BOGOTA: 'Bogotá D.C.',
  'BOGOTA DC': 'Bogotá D.C.',
  'BOGOTA D.C.': 'Bogotá D.C.',
  'BOGOTÁ': 'Bogotá D.C.',
  'BOGOTÁ D.C.': 'Bogotá D.C.',
  'BOGOTÁ DC': 'Bogotá D.C.',
  MEDELLIN: 'Antioquia',
  MEDELLÍN: 'Antioquia',
  CALI: 'Valle del Cauca',
  BARRANQUILLA: 'Atlántico',
  CARTAGENA: 'Bolívar',
  BUCARAMANGA: 'Santander',
  CUCUTA: 'Norte de Santander',
  CÚCUTA: 'Norte de Santander',
  PEREIRA: 'Risaralda',
  MANIZALES: 'Caldas',
  ARMENIA: 'Quindío',
  IBAGUE: 'Tolima',
  IBAGUÉ: 'Tolima',
  NEIVA: 'Huila',
  PASTO: 'Nariño',
  POPAYAN: 'Cauca',
  POPAYÁN: 'Cauca',
  VILLAVICENCIO: 'Meta',
  MONTERIA: 'Córdoba',
  MONTERÍA: 'Córdoba',
  SANTA: 'Magdalena',
  'SANTA MARTA': 'Magdalena',
  VALLEDUPAR: 'Cesar',
  SINCELEJO: 'Sucre',
  QUIBDO: 'Chocó',
  QUIBDÓ: 'Chocó',
  YOPAL: 'Casanare',
  TUNJA: 'Boyacá',
  BUENAVENTURA: 'Valle del Cauca',
};

export const ZONA_OPTIONS: readonly string[] = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bogotá D.C.',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
];

export function geoNameToZona(geoName: string): string {
  const key = normalizeKey(geoName);
  return GEO_NAME_TO_ZONA[key] ?? titleCaseZona(geoName);
}

export function toCanonicalDepartment(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'Sin zona';
  const trimmed = raw.trim();
  const key = normalizeKey(trimmed);
  if (BUSINESS_ALIAS_TO_ZONA[key]) return BUSINESS_ALIAS_TO_ZONA[key];
  const fromCatalog = ZONA_OPTIONS.find((z) => normalizeKey(z) === key);
  if (fromCatalog) return fromCatalog;
  return trimmed;
}

function titleCaseZona(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Sitios conocidos por zona (catálogo base; se amplía con datos en runtime). */
export const ZONA_SITIOS: Record<string, readonly string[]> = {
  Antioquia: ['Medellín', 'Rionegro', 'Envigado', 'Bello', 'Itagüí'],
  'Atlántico': ['Barranquilla', 'Soledad', 'Malambo'],
  'Bogotá D.C.': ['Bogotá', 'Bogotá D.C.'],
  'Bolívar': ['Cartagena', 'Magangué'],
  Boyacá: ['Tunja', 'Duitama', 'Sogamoso'],
  Caldas: ['Manizales'],
  Caquetá: ['Florencia'],
  Casanare: ['Yopal'],
  Cauca: ['Popayán'],
  Cesar: ['Valledupar'],
  Chocó: ['Quibdó', 'Istmina'],
  Córdoba: ['Montería'],
  Cundinamarca: ['Soacha', 'Chía', 'Zipaquirá', 'Facatativá'],
  Huila: ['Neiva'],
  'La Guajira': ['Riohacha'],
  Magdalena: ['Santa Marta'],
  Meta: ['Villavicencio'],
  Nariño: ['Pasto'],
  'Norte de Santander': ['Cúcuta'],
  Quindío: ['Armenia'],
  Risaralda: ['Pereira', 'Dosquebradas'],
  Santander: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta'],
  Sucre: ['Sincelejo'],
  Tolima: ['Ibagué'],
  'Valle del Cauca': ['Cali', 'Buenaventura', 'Palmira', 'Yumbo'],
};

const SITE_TO_ZONA: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [zona, sitios] of Object.entries(ZONA_SITIOS)) {
    for (const sitio of sitios) {
      map[normalizeKey(sitio)] = zona;
    }
  }
  return map;
})();

/** Resuelve zona a partir de sede/ciudad de telemetría. */
export function resolveZoneFromLocation(
  sede: string | null | undefined,
  ciudad: string | null | undefined
): string {
  const candidates = [sede, ciudad].filter((v): v is string => Boolean(v?.trim()));
  for (const c of candidates) {
    const key = normalizeKey(c);
    if (SITE_TO_ZONA[key]) return SITE_TO_ZONA[key];
    const asDept = toCanonicalDepartment(c);
    if (ZONA_OPTIONS.includes(asDept)) return asDept;
  }
  if (candidates[0]) return toCanonicalDepartment(candidates[0]);
  return 'Sin zona';
}

export function resolveSiteLabel(
  sede: string | null | undefined,
  ciudad: string | null | undefined
): string {
  const raw = (sede?.trim() || ciudad?.trim() || '').split(',')[0]?.trim();
  return raw || 'Sin sitio';
}
