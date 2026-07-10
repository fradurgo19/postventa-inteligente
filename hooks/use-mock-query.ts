/**
 * PARTEQUIPOS SAS — Custom React Query hooks backed by mock data.
 *
 * Each hook simulates a realistic async API call (500–800 ms delay) and is
 * fully typed.  Swap out the mock resolver for a real fetch() call when the
 * backend is ready — the component interface stays identical.
 */

import { useQuery } from "@tanstack/react-query";
import {
  MACHINES,
  BRANDS,
  MAINTENANCE_ACTIVITIES,
  SPARE_PARTS,
  MAINTENANCE_SCHEDULES,
  DASHBOARD_KPIS,
  CUSTOMERS,
  USERS,
  ACTIVITY_LOG,
  AUDIT_LOG,
  COLOMBIA_CITIES,
  type Machine,
  type MaintenanceActivity,
  type SparePart,
  type MaintenanceSchedule,
  type DashboardKPI,
  type Customer,
  type User,
  type ActivityLog,
  type AuditLog,
  type ColombiaCity,
  type MachineStatus,
  type PartCategory,
  type MaintenanceStatus,
} from "@/lib/mock-data";

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a Promise that resolves after a random delay between min and max ms */
function simulateDelay<T>(data: T, min = 500, max = 800): Promise<T> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter types
// ─────────────────────────────────────────────────────────────────────────────

export interface MachineFilters {
  brand?: string;
  status?: MachineStatus;
  customerId?: string;
  city?: string;
  category?: string;
  search?: string;
}

export interface PartFilters {
  brand?: string;
  category?: PartCategory;
  warehouse?: string;
  lowStockOnly?: boolean;
  machineId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface MaintenanceFilters {
  status?: MaintenanceStatus;
  machineId?: string;
  customerId?: string;
  technicianId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. useMachines
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the full list of machines, optionally filtered.
 *
 * @example
 * const { data: machines, isLoading } = useMachines({ brand: "Caterpillar" });
 */
export function useMachines(filters?: MachineFilters) {
  return useQuery<Machine[]>({
    queryKey: ["machines", filters],
    queryFn: () => {
      let result = [...MACHINES];

      if (filters?.brand) {
        result = result.filter((m) =>
          m.brand.toLowerCase().includes(filters.brand!.toLowerCase())
        );
      }
      if (filters?.status) {
        result = result.filter((m) => m.status === filters.status);
      }
      if (filters?.customerId) {
        result = result.filter((m) => m.customerId === filters.customerId);
      }
      if (filters?.city) {
        result = result.filter((m) =>
          m.city.toLowerCase().includes(filters.city!.toLowerCase())
        );
      }
      if (filters?.category) {
        result = result.filter((m) =>
          m.category.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (m) =>
            m.serialNumber.toLowerCase().includes(q) ||
            m.model.toLowerCase().includes(q) ||
            m.brand.toLowerCase().includes(q) ||
            m.customerName.toLowerCase().includes(q) ||
            m.location.toLowerCase().includes(q)
        );
      }

      return simulateDelay(result);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. useMachine  (single record)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single machine by id.
 */
export function useMachine(id: string) {
  return useQuery<Machine | undefined>({
    queryKey: ["machine", id],
    queryFn: () =>
      simulateDelay(MACHINES.find((m) => m.id === id)),
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. useBrands
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the sorted list of unique equipment brands present in the dataset.
 */
export function useBrands() {
  return useQuery<string[]>({
    queryKey: ["brands"],
    queryFn: () => simulateDelay([...BRANDS]),
    staleTime: Infinity, // brand list is static
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. useMaintenanceActivities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns maintenance activities, optionally filtered by machineId (via brand)
 * or by a free-text search.
 *
 * @param machineId - when supplied, returns only activities applicable to that
 *                    machine's brand.
 * @param search    - optional text filter on name / code / description.
 */
export function useMaintenanceActivities(machineId?: string, search?: string) {
  return useQuery<MaintenanceActivity[]>({
    queryKey: ["maintenance-activities", machineId, search],
    queryFn: () => {
      let result = [...MAINTENANCE_ACTIVITIES];

      if (machineId) {
        const machine = MACHINES.find((m) => m.id === machineId);
        if (machine) {
          result = result.filter(
            (a) =>
              a.applicableBrands.length === 0 ||
              a.applicableBrands.includes(machine.brand)
          );
        }
      }

      if (search) {
        const q = search.toLowerCase();
        result = result.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.code.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
        );
      }

      return simulateDelay(result);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. useParts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the spare parts catalogue, optionally filtered.
 *
 * @example
 * const { data: parts } = useParts({ category: "filtros", lowStockOnly: true });
 */
export function useParts(filters?: PartFilters) {
  return useQuery<SparePart[]>({
    queryKey: ["parts", filters],
    queryFn: () => {
      let result = [...SPARE_PARTS];

      if (filters?.brand) {
        result = result.filter((p) =>
          p.brand.toLowerCase().includes(filters.brand!.toLowerCase())
        );
      }
      if (filters?.category) {
        result = result.filter((p) => p.category === filters.category);
      }
      if (filters?.warehouse) {
        result = result.filter((p) =>
          p.warehouse.toLowerCase().includes(filters.warehouse!.toLowerCase())
        );
      }
      if (filters?.lowStockOnly) {
        result = result.filter((p) => p.stock <= p.minStock);
      }
      if (filters?.machineId) {
        result = result.filter((p) =>
          p.compatibleMachines.includes(filters.machineId!)
        );
      }
      if (filters?.minPrice !== undefined) {
        result = result.filter((p) => p.unitPrice >= filters.minPrice!);
      }
      if (filters?.maxPrice !== undefined) {
        result = result.filter((p) => p.unitPrice <= filters.maxPrice!);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.description.toLowerCase().includes(q) ||
            p.sapCode.toLowerCase().includes(q) ||
            p.partNumber.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)
        );
      }

      return simulateDelay(result);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. usePart  (single record)
// ─────────────────────────────────────────────────────────────────────────────

export function usePart(id: string) {
  return useQuery<SparePart | undefined>({
    queryKey: ["part", id],
    queryFn: () => simulateDelay(SPARE_PARTS.find((p) => p.id === id)),
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. useMaintenances  (schedules / work orders)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns maintenance schedules / work orders, optionally filtered.
 */
export function useMaintenances(filters?: MaintenanceFilters) {
  return useQuery<MaintenanceSchedule[]>({
    queryKey: ["maintenances", filters],
    queryFn: () => {
      let result = [...MAINTENANCE_SCHEDULES];

      if (filters?.status) {
        result = result.filter((s) => s.status === filters.status);
      }
      if (filters?.machineId) {
        result = result.filter((s) => s.machineId === filters.machineId);
      }
      if (filters?.customerId) {
        result = result.filter((s) => s.customerId === filters.customerId);
      }
      if (filters?.technicianId) {
        result = result.filter((s) => s.technicianId === filters.technicianId);
      }
      if (filters?.dateFrom) {
        result = result.filter(
          (s) => s.scheduledDate >= filters.dateFrom!
        );
      }
      if (filters?.dateTo) {
        result = result.filter(
          (s) => s.scheduledDate <= filters.dateTo!
        );
      }

      return simulateDelay(result);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. useMaintenance  (single record)
// ─────────────────────────────────────────────────────────────────────────────

export function useMaintenance(id: string) {
  return useQuery<MaintenanceSchedule | undefined>({
    queryKey: ["maintenance", id],
    queryFn: () =>
      simulateDelay(MAINTENANCE_SCHEDULES.find((s) => s.id === id)),
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. useDashboardKPIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the dashboard KPI block — a single object with all headline numbers,
 * chart series, and breakdown arrays.
 */
export function useDashboardKPIs() {
  return useQuery<DashboardKPI>({
    queryKey: ["dashboard-kpis"],
    queryFn: () => simulateDelay({ ...DASHBOARD_KPIS }),
    staleTime: 2 * 60 * 1000, // KPIs refresh more frequently (2 min)
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. useCustomers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns customers, optionally filtered by segment or search text.
 */
export function useCustomers(search?: string, segment?: string) {
  return useQuery<Customer[]>({
    queryKey: ["customers", search, segment],
    queryFn: () => {
      let result = [...CUSTOMERS];

      if (segment) {
        result = result.filter((c) =>
          c.segment.toLowerCase().includes(segment.toLowerCase())
        );
      }
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.nit.includes(q) ||
            c.contact.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q)
        );
      }

      return simulateDelay(result);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. useCustomer  (single record)
// ─────────────────────────────────────────────────────────────────────────────

export function useCustomer(id: string) {
  return useQuery<Customer | undefined>({
    queryKey: ["customer", id],
    queryFn: () => simulateDelay(CUSTOMERS.find((c) => c.id === id)),
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. useUsers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the list of system users.
 */
export function useUsers(activeOnly = false) {
  return useQuery<User[]>({
    queryKey: ["users", activeOnly],
    queryFn: () => {
      const result = activeOnly
        ? USERS.filter((u) => u.isActive)
        : [...USERS];
      return simulateDelay(result);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. useActivityLog
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the most-recent activity log entries.
 * @param limit - max entries to return (default: 10)
 */
export function useActivityLog(limit = 10) {
  return useQuery<ActivityLog[]>({
    queryKey: ["activity-log", limit],
    queryFn: () =>
      simulateDelay(
        ACTIVITY_LOG.slice(0, limit).sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      ),
    staleTime: 60 * 1000, // activity log — 1 minute
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. useAuditLog
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns audit log entries, optionally filtered by userId or module.
 */
export function useAuditLog(userId?: string, module?: string) {
  return useQuery<AuditLog[]>({
    queryKey: ["audit-log", userId, module],
    queryFn: () => {
      let result = [...AUDIT_LOG];
      if (userId) result = result.filter((a) => a.userId === userId);
      if (module) result = result.filter((a) => a.module === module);
      return simulateDelay(
        result.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. useMapData  (Colombia cities with machine counts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns Colombia city coordinates enriched with current machine counts.
 * Useful for map/geographical views.
 */
export function useMapData() {
  return useQuery<ColombiaCity[]>({
    queryKey: ["map-data"],
    queryFn: () => {
      // Recompute machine counts from live data
      const result = COLOMBIA_CITIES.map((city) => ({
        ...city,
        machineCount: MACHINES.filter((m) => m.city === city.name).length,
      }));
      return simulateDelay(result);
    },
    staleTime: Infinity,
  });
}
