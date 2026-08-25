import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminUser,
  createAsesor,
  createCliente,
  createMaquina,
  fetchAdminAsesores,
  fetchAdminClientes,
  fetchAdminDomainSummary,
  fetchAdminImportaciones,
  fetchAdminMaquinas,
  fetchAdminRoleSummaries,
  fetchAdminSedes,
  fetchAdminUsers,
  fetchAuditoria,
  fetchModuleAccessMatrix,
  fetchSystemConfig,
  saveModuleAccessMatrix,
  saveSystemConfig,
  setPerfilActivo,
  updateAsesor,
  updateCliente,
  updateMaquina,
  updatePerfil,
  type AdminPerfilUpdate,
  type AsesorInput,
  type AuditQuery,
  type ClienteInput,
  type CreateAdminUserInput,
  type MaquinaInput,
  type SystemConfig,
} from '@/services/administration.service';
import type { ModuleAccessMatrix } from '@/lib/admin/module-access';

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

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminUserInput) => createAdminUser(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
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

export function useAdminSedes() {
  return useQuery({
    queryKey: ['admin', 'sedes'],
    queryFn: fetchAdminSedes,
    staleTime: 60_000,
  });
}

export function useCreateAsesor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AsesorInput) => createAsesor(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useUpdateAsesor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AsesorInput> }) =>
      updateAsesor(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClienteInput) => createCliente(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ClienteInput> }) =>
      updateCliente(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useCreateMaquina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MaquinaInput) => createMaquina(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
      await qc.invalidateQueries({ queryKey: ['proyectados'] });
    },
  });
}

export function useUpdateMaquina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MaquinaInput> }) =>
      updateMaquina(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
      await qc.invalidateQueries({ queryKey: ['proyectados'] });
    },
  });
}

export function useModuleAccessMatrix() {
  return useQuery({
    queryKey: ['app', 'module-access'],
    queryFn: fetchModuleAccessMatrix,
    staleTime: 60_000,
  });
}

export function useSaveModuleAccessMatrix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matrix: ModuleAccessMatrix) => saveModuleAccessMatrix(matrix),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['app', 'module-access'] });
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
