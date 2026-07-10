import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  corsOrigin: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export function loadConfig(): AppConfig {
  const port = Number(process.env.PORT ?? 4000);

  return {
    port: Number.isFinite(port) ? port : 4000,
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };
}

export function isSupabaseConfigured(config: AppConfig): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}
