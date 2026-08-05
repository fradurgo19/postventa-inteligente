/**
 * Feature flags de módulos. Cambiar a `true` para reactivar sin refactor.
 * CPP oculto del menú y de /cpp hasta nueva orden.
 */
export type FeatureFlagKey = 'cppModule';

export const FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  cppModule: false,
};

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag];
}
