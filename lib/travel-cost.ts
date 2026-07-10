import type { TarifaDesplazamiento } from '@/types/database';

export const DEFAULT_TARIFA: TarifaDesplazamiento = {
  costo_por_km: 3500,
  costo_por_hora_viaje: 142500,
  factor_ida_vuelta: 2,
  iva_porcentaje: 19,
};

/**
 * Calcula costo de desplazamiento: un trayecto (km + horas) × ida y vuelta.
 */
export function calcularCostoDesplazamiento(
  kmTrayecto: number,
  horasTrayecto: number,
  tarifa: TarifaDesplazamiento = DEFAULT_TARIFA
): number {
  const km = Math.max(0, kmTrayecto);
  const horas = Math.max(0, horasTrayecto);
  const costoKm = km * tarifa.costo_por_km;
  const costoHoras = horas * tarifa.costo_por_hora_viaje;
  return Math.round((costoKm + costoHoras) * tarifa.factor_ida_vuelta);
}

export function calcularIva(subtotal: number, porcentaje = DEFAULT_TARIFA.iva_porcentaje): number {
  return Math.round(subtotal * (porcentaje / 100));
}
