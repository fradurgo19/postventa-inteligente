import type { CppCatalogItem } from '@/types/database';

/** Formato interno de la página CPP */
export interface CppPartView {
  id: string;
  sapCode: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  price: number;
  listPrice: number;
  stock: number;
  minStock: number;
  warehouse: string;
  shelf: string;
  leadTime: string;
  compatibility: string[];
  lastUpdated: string;
  manuals: { title: string; url: string }[];
  imagenUrl?: string | null;
  recomendacion?: string | null;
  equivalencia1?: string | null;
  modelo?: string;
  componente?: string;
}

export function mapCatalogToCppPart(item: CppCatalogItem): CppPartView {
  const price = item.precio_sap ?? item.precio_lista;
  const stock = item.stock_sap ?? item.stock_disponible;

  return {
    id: item.id,
    sapCode: item.ref_sap,
    name: item.nombre,
    description: item.comentario ?? item.recomendacion ?? item.nombre,
    brand: item.marca,
    category: item.subtipo_componente || item.componente,
    price,
    listPrice: item.precio_lista,
    stock,
    minStock: 5,
    warehouse: item.bodega_sap ?? item.bodega ?? 'N/A',
    shelf: '—',
    leadTime: 'Consultar SAP',
    compatibility: item.modelo ? [item.modelo] : [],
    lastUpdated: new Date().toISOString(),
    manuals: item.adjuntos ?? [],
    imagenUrl: item.imagen_url,
    recomendacion: item.recomendacion,
    equivalencia1: item.equivalencia1,
    modelo: item.modelo,
    componente: item.componente,
  };
}
