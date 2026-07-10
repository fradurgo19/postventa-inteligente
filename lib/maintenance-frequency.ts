import type { MaintenanceFrequencyHours } from '@/types/database';

/** Matriz embebida: frecuencias que aplican en cada hito de horómetro (250–9000 h) */
const FREQUENCY_MATRIX: Record<number, MaintenanceFrequencyHours[]> = buildFrequencyMatrix();

function buildFrequencyMatrix(): Record<number, MaintenanceFrequencyHours[]> {
  const matrix: Record<number, MaintenanceFrequencyHours[]> = {};

  for (let h = 250; h <= 9000; h += 250) {
    const freqs: MaintenanceFrequencyHours[] = [250];

    if (h >= 1000 && h % 1000 === 0) {
      freqs.push(1000);
    }
    if (h >= 2000 && h % 2000 === 0 && Math.floor(h / 2000) % 2 === 1) {
      freqs.push(2000);
    }
    if (h >= 4000 && h % 4000 === 0) {
      freqs.push(4000);
    }
    if (h >= 5000 && h % 5000 === 0) {
      freqs.push(5000);
    }

    matrix[h] = freqs;
  }

  return matrix;
}

/** Normaliza horómetro al hito de mantenimiento más cercano (múltiplo de 250) */
export function normalizeHorometro(horometro: number): number {
  if (horometro <= 0) return 250;
  return Math.ceil(horometro / 250) * 250;
}

/** Retorna las frecuencias de mantenimiento que aplican según horómetro */
export function getFrecuenciasPorHorometro(horometro: number): MaintenanceFrequencyHours[] {
  const normalized = normalizeHorometro(horometro);
  return FREQUENCY_MATRIX[normalized] ?? [250];
}

/** Etiquetas en español para UI */
export const FRECUENCIA_LABELS: Record<MaintenanceFrequencyHours, string> = {
  250: 'Mantenimiento 250 h',
  1000: 'Mantenimiento 1.000 h',
  2000: 'Mantenimiento 2.000 h',
  4000: 'Mantenimiento 4.000 h',
  5000: 'Mantenimiento 5.000 h',
};
