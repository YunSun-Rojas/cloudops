import { hasSupabaseConfig, supabase } from './supabase.ts';

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

const LOCAL_HISTORY_KEY = 'cloudops_auditoria_history';

/** Sin autenticación todavía: se registra con un usuario genérico */
const CURRENT_USER = 'invitado';

const getLocalHistory = (): AuditRow[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalHistory = (entries: AuditRow[]) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Ignora errores de almacenamiento local para no romper la captura.
  }
};

const getLocalHistoryForModule = (modulo: string): AuditRow[] =>
  getLocalHistory().filter((entry) => entry.modulo === modulo);

const addLocalAuditEntry = (entry: AuditRow): void => {
  const entries = getLocalHistory();
  const nextEntries = [entry, ...entries.filter((item) => item.id !== entry.id)];
  saveLocalHistory(nextEntries);
};

export function collectDeviceInfo(): AuditDevice {
  const browserNavigator = typeof navigator === 'undefined' ? undefined : navigator;
  const browserWindow = typeof window === 'undefined' ? undefined : window;

  return {
    userAgent: browserNavigator?.userAgent ?? 'unknown',
    platform: browserNavigator?.platform ?? 'unknown',
    language: browserNavigator?.language ?? 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
    screen: browserWindow?.screen ? `${browserWindow.screen.width}x${browserWindow.screen.height}` : 'unknown',
  };
}

export async function logAudit(
  accion: string,
  modulo: string,
  ubicacion?: AuditLocation,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const auditEntry: AuditRow = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    usuario: CURRENT_USER,
    accion,
    modulo,
    ubicacion: ubicacion ?? null,
    dispositivo: collectDeviceInfo(),
    metadata: metadata ?? null,
    created_at: new Date().toISOString(),
  };

  if (!hasSupabaseConfig) {
    addLocalAuditEntry(auditEntry);
    return;
  }

  try {
    const { error } = await supabase.from('auditorias').insert({
      usuario: auditEntry.usuario,
      accion: auditEntry.accion,
      modulo: auditEntry.modulo,
      ubicacion: auditEntry.ubicacion,
      dispositivo: auditEntry.dispositivo,
      metadata: auditEntry.metadata,
    });

    if (error) throw error;
  } catch (error) {
    addLocalAuditEntry(auditEntry);
    if (error instanceof Error) {
      console.warn('Supabase no disponible, se guardó la auditoría localmente.', error.message);
    }
  }
}

export async function fetchAuditHistory(modulo: string, limit = 20): Promise<AuditRow[]> {
  if (!hasSupabaseConfig) {
    return getLocalHistoryForModule(modulo).slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from('auditorias')
      .select('*')
      .eq('modulo', modulo)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as AuditRow[];
  } catch (error) {
    const localRows = getLocalHistoryForModule(modulo).slice(0, limit);
    if (localRows.length > 0) return localRows;
    console.warn('No se pudo cargar el historial desde Supabase; se usó el almacenamiento local.', error);
    return [];
  }
}

export async function clearAuditHistory(modulo: string): Promise<void> {
  if (!hasSupabaseConfig) {
    saveLocalHistory(getLocalHistory().filter((entry) => entry.modulo !== modulo));
    return;
  }

  try {
    const { error } = await supabase.from('auditorias').delete().eq('modulo', modulo);
    if (error) throw error;
  } catch (error) {
    saveLocalHistory(getLocalHistory().filter((entry) => entry.modulo !== modulo));
    console.warn('No se pudo limpiar el historial de Supabase; se limpió el local.', error);
  }
}