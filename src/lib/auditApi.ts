import { supabase } from './supabase';

export type AuditSource = 'gps' | 'ip';

export interface AuditLocation {
  source: AuditSource;
  latitude: number;
  longitude: number;
  /** metros de radio: precisión real (GPS) o aproximada (IP) */
  radiusMeters: number;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface AuditDevice {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screen: string;
}

export interface AuditRow {
  id: number;
  usuario: string | null;
  accion: string;
  modulo: string | null;
  ubicacion: AuditLocation | null;
  dispositivo: AuditDevice | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Sin autenticación todavía: se registra con un usuario genérico */
const CURRENT_USER = 'invitado';

export function collectDeviceInfo(): AuditDevice {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${window.screen.width}x${window.screen.height}`,
  };
}

export async function logAudit(
  accion: string,
  modulo: string,
  ubicacion?: AuditLocation,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('auditorias').insert({
    usuario: CURRENT_USER,
    accion,
    modulo,
    ubicacion: ubicacion ?? null,
    dispositivo: collectDeviceInfo(),
    metadata: metadata ?? null,
  });
  if (error) throw error;
}

export async function fetchAuditHistory(modulo: string, limit = 20): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from('auditorias')
    .select('*')
    .eq('modulo', modulo)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditRow[];
}

export async function clearAuditHistory(modulo: string): Promise<void> {
  const { error } = await supabase.from('auditorias').delete().eq('modulo', modulo);
  if (error) throw error;
}