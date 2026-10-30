import { createClient } from '@supabase/supabase-js';

const runtimeEnv = (typeof import.meta !== 'undefined' && import.meta.env) ||
  ((globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {});

const supabaseUrl = runtimeEnv.VITE_SUPABASE_URL?.trim();
const supabaseKey = runtimeEnv.VITE_SUPABASE_ANON_KEY?.trim();

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseKey || 'public-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);