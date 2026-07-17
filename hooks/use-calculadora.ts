import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMarcas,
  fetchModelos,
  calculatePreventiveMaintenance,
  registerTemparioImport,
  fetchTempariosAdmin,
  updateTempario,
  deactivateTempario,
  type TempariosAdminQuery,
} from '@/services/calculadora.service';
import type {
  PreventiveQuoteInput,
  PreventiveQuoteResult,
  TemparioUpdatePatch,
} from '@/types/database';

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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileName, ok, error }: { fileName: string; ok: number; error: number }) =>
      registerTemparioImport(fileName, ok, error),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calculadora'] });
    },
  });
}

export function useTempariosAdmin(query: TempariosAdminQuery) {
  return useQuery({
    queryKey: ['calculadora', 'temparios-admin', query],
    queryFn: () => fetchTempariosAdmin(query),
    staleTime: 30 * 1000,
  });
}

export function useUpdateTempario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
      updatedBy,
    }: {
      id: string;
      patch: TemparioUpdatePatch;
      updatedBy?: string;
    }) => updateTempario(id, patch, updatedBy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calculadora'] });
    },
  });
}

export function useDeactivateTempario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updatedBy }: { id: string; updatedBy?: string }) =>
      deactivateTempario(id, updatedBy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calculadora'] });
    },
  });
}

export type { PreventiveQuoteInput, PreventiveQuoteResult };
