import type { TarifaDesplazamiento } from '@/types/database';

/**
 * Tarifas alineadas a Power Apps (desplazamiento):
 * Valor1 = horasIda * 2 * 65000
 * Valor2 = kmIda * 2 * 1600
 * TotalHoras = horasIda * 2 + 4
 * Hospedaje / Alimentación según TotalHoras
 */
export const DEFAULT_TARIFA: TarifaDesplazamiento = {
  costo_por_km: 1600,
  costo_por_hora_viaje: 65000,
  factor_ida_vuelta: 2,
  iva_porcentaje: 19,
};

/** Horas fijas de servicio sumadas a ida+vuelta (Power Apps: +4). */
export const HORAS_SERVICIO_BASE = 4;

/** Hospedaje cuando TotalHoras >= 9. */
export const COSTO_HOSPEDAJE = 100_000;

/** Alimentación: 80.000 base (doble si jornada larga). */
export const COSTO_ALIMENTACION_UNIT = 80_000;

export interface DesplazamientoBreakdown {
  valorHoras: number;
  valorKm: number;
  totalHoras: number;
  hospedaje: number;
  alimentacion: number;
  total: number;
}

/**
 * Alimentación según TotalHoras (Power Apps anidados If).
 * >= 9 → 80.000 × 2 | 5–8 → 80.000 | 1–4 → 40.000 | resto → 0
 */
export function calcularAlimentacion(totalHoras: number): number {
  if (totalHoras >= 9) {
    return COSTO_ALIMENTACION_UNIT * 2;
  }
  if (totalHoras >= 5 && totalHoras <= 8) {
    return COSTO_ALIMENTACION_UNIT;
  }
  if (totalHoras >= 1 && totalHoras <= 4) {
    return COSTO_ALIMENTACION_UNIT / 2;
  }
  return 0;
}

export function calcularHospedaje(totalHoras: number): number {
  return totalHoras >= 9 ? COSTO_HOSPEDAJE : 0;
}

/**
 * Desglose de desplazamiento (entradas = un trayecto / ida).
 * TotalDesplazamiento = Valor1 + Valor2 + Hospedaje + Alimentacion
 */
export function calcularDesplazamientoDetalle(
  kmTrayecto: number,
  horasTrayecto: number,
  tarifa: TarifaDesplazamiento = DEFAULT_TARIFA
): DesplazamientoBreakdown {
  const km = Math.max(0, Number(kmTrayecto) || 0);
  const horas = Math.max(0, Number(horasTrayecto) || 0);
  const factor = tarifa.factor_ida_vuelta > 0 ? tarifa.factor_ida_vuelta : 2;

  const valorHoras = horas * factor * tarifa.costo_por_hora_viaje;
  const valorKm = km * factor * tarifa.costo_por_km;
  const totalHoras = horas * factor + HORAS_SERVICIO_BASE;
  const hospedaje = calcularHospedaje(totalHoras);
  const alimentacion = calcularAlimentacion(totalHoras);
  const total = Math.round(valorHoras + valorKm + hospedaje + alimentacion);

  return {
    valorHoras: Math.round(valorHoras),
    valorKm: Math.round(valorKm),
    totalHoras,
    hospedaje,
    alimentacion,
    total,
  };
}

/**
 * Calcula costo de desplazamiento (Power Apps TotalDesplazamiento).
 * kmTrayecto / horasTrayecto = un trayecto (ida); se duplican con factor_ida_vuelta.
 */
export function calcularCostoDesplazamiento(
  kmTrayecto: number,
  horasTrayecto: number,
  tarifa: TarifaDesplazamiento = DEFAULT_TARIFA
): number {
  return calcularDesplazamientoDetalle(kmTrayecto, horasTrayecto, tarifa).total;
}

export function calcularIva(subtotal: number, porcentaje = DEFAULT_TARIFA.iva_porcentaje): number {
  return Math.round(subtotal * (porcentaje / 100));
}
