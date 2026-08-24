import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchTelemetriaEquipos,
  fetchProjectedKpis,
  fetchProyectadosImportHistory,
  registerTelemetriaImport,
} from '@/services/projected-maintenance.service';

export function useTelemetriaEquipos() {
  return useQuery({
    queryKey: ['proyectados', 'telemetria'],
    queryFn: fetchTelemetriaEquipos,
    staleTime: 2 * 60 * 1000,
  });
}

export function useProjectedKpis() {
  return useQuery({
    queryKey: ['proyectados', 'kpis'],
    queryFn: fetchProjectedKpis,
    staleTime: 2 * 60 * 1000,
  });
}

export function useProyectadosImportHistory() {
  return useQuery({
    queryKey: ['proyectados', 'importaciones'],
    queryFn: fetchProyectadosImportHistory,
    staleTime: 60 * 1000,
  });
}

export function useTelemetriaImport() {
  return useMutation({
    mutationFn: ({ fileName, ok, error }: { fileName: string; ok: number; error: number }) =>
      registerTelemetriaImport(fileName, ok, error),
  });
}
