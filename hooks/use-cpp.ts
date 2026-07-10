import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchCppCatalog,
  fetchCppMarcas,
  fetchCppModelos,
  fetchSapAvailability,
  registerCppImport,
} from '@/services/cpp.service';
import type { CppFilters } from '@/types/database';

export function useCppCatalog(filters: CppFilters = {}) {
  return useQuery({
    queryKey: ['cpp', 'catalog', filters],
    queryFn: () => fetchCppCatalog(filters),
    staleTime: 60 * 1000,
  });
}

export function useCppMarcas() {
  return useQuery({
    queryKey: ['cpp', 'marcas'],
    queryFn: fetchCppMarcas,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCppModelos(marca: string) {
  return useQuery({
    queryKey: ['cpp', 'modelos', marca],
    queryFn: () => fetchCppModelos(marca),
    enabled: Boolean(marca),
  });
}

export function useSapAvailability(refSap: string | null) {
  return useQuery({
    queryKey: ['sap', refSap],
    queryFn: () => (refSap ? fetchSapAvailability(refSap) : null),
    enabled: Boolean(refSap),
    staleTime: 30 * 1000,
  });
}

export function useCppImport() {
  return useMutation({
    mutationFn: ({ fileName, ok, error }: { fileName: string; ok: number; error: number }) =>
      registerCppImport(fileName, ok, error),
  });
}
