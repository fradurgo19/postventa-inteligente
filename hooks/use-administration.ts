import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminAsesores,
  fetchAdminClientes,
  fetchAdminDomainSummary,
  fetchAdminImportaciones,
  fetchAdminMaquinas,
  fetchAdminRoleSummaries,
  fetchAdminUsers,
  fetchAuditoria,
  fetchSystemConfig,
  saveSystemConfig,
  setPerfilActivo,
  updatePerfil,
  type AdminPerfilUpdate,
  type AuditQuery,
  type SystemConfig,
} from '@/services/administration.service';

export function useAdminDomainSummary() {
  return useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: fetchAdminDomainSummary,
    staleTime: 60_000,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchAdminUsers,
    staleTime: 60_000,
  });
}

export function useAdminAsesores() {
  return useQuery({
    queryKey: ['admin', 'asesores'],
    queryFn: fetchAdminAsesores,
    staleTime: 60_000,
  });
}

export function useAdminClientes() {
  return useQuery({
    queryKey: ['admin', 'clientes'],
    queryFn: () => fetchAdminClientes(80),
    staleTime: 60_000,
  });
}

export function useAdminMaquinas() {
  return useQuery({
    queryKey: ['admin', 'maquinas'],
    queryFn: () => fetchAdminMaquinas(80),
    staleTime: 60_000,
  });
}

export function useAdminImportaciones() {
  return useQuery({
    queryKey: ['admin', 'importaciones'],
    queryFn: () => fetchAdminImportaciones(40),
    staleTime: 30_000,
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: fetchAdminRoleSummaries,
    staleTime: 60_000,
  });
}

export function useSystemConfig() {
  return useQuery({
    queryKey: ['admin', 'config'],
    queryFn: fetchSystemConfig,
    staleTime: 60_000,
  });
}

export function useAuditoria(query: AuditQuery) {
  return useQuery({
    queryKey: ['admin', 'auditoria', query],
    queryFn: () => fetchAuditoria(query),
    staleTime: 30_000,
  });
}

export function useTogglePerfilActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => setPerfilActivo(id, activo),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useUpdatePerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AdminPerfilUpdate }) =>
      updatePerfil(id, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useSaveSystemConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ config, updatedBy }: { config: SystemConfig; updatedBy: string }) =>
      saveSystemConfig(config, updatedBy),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'config'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'auditoria'] });
    },
  });
}
