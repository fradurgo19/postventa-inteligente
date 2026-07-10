import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchMarcas,
  fetchModelos,
  calculatePreventiveMaintenance,
  registerTemparioImport,
} from '@/services/calculadora.service';
import type { PreventiveQuoteInput, PreventiveQuoteResult } from '@/types/database';

export function useCalculadoraMarcas() {
  return useQuery({
    queryKey: ['calculadora', 'marcas'],
    queryFn: fetchMarcas,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalculadoraModelos(marca: string) {
  return useQuery({
    queryKey: ['calculadora', 'modelos', marca],
    queryFn: () => fetchModelos(marca),
    enabled: Boolean(marca),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalculatePreventive() {
  return useMutation({
    mutationFn: (input: PreventiveQuoteInput) => calculatePreventiveMaintenance(input),
  });
}

export function useTemparioImport() {
  return useMutation({
    mutationFn: ({ fileName, ok, error }: { fileName: string; ok: number; error: number }) =>
      registerTemparioImport(fileName, ok, error),
  });
}

export type { PreventiveQuoteInput, PreventiveQuoteResult };
