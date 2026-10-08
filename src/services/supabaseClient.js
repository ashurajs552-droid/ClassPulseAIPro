import { createClient } from '@supabase/supabase-js';

const CONFIG_KEY = 'veriface_supabase_config';

const DEFAULT_SUPABASE_URL = 'https://your-project-id.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'your-supabase-anon-key';

export function getSupabaseConfig() {
  let stored = null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse stored Supabase config:', e);
  }

  const url = stored?.url || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = stored?.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export function saveSupabaseConfig(url, anonKey) {
  const config = {
    url: (url || '').trim(),
    anonKey: (anonKey || '').trim()
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  // Re-instantiate client
  clientInstance = null;
  return getSupabaseClient();
}

let clientInstance = null;

export function getSupabaseClient() {
  if (clientInstance) return clientInstance;

  const { url, anonKey } = getSupabaseConfig();

  if (url && anonKey && url.startsWith('http')) {
    try {
      clientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return clientInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export async function testSupabaseConnection(customUrl, customKey) {
  const url = (customUrl !== undefined ? customUrl : getSupabaseConfig().url).trim();
  const anonKey = (customKey !== undefined ? customKey : getSupabaseConfig().anonKey).trim();

  if (!url || !anonKey) {
    return { success: false, message: 'URL and Anon Key are required.' };
  }

  try {
    const testClient = createClient(url, anonKey);
    const { data, error } = await testClient.from('students').select('id').limit(1);

    if (error) {
      // If table doesn't exist yet, but connection succeeded
      if (error.code === '42P01') {
        return {
          success: true,
          needsSchema: true,
          message: 'Connected to Supabase! The "students" table does not exist yet. Please run the supabase-schema.sql script in SQL Editor.'
        };
      }
      return { success: false, message: `Supabase Error: ${error.message} (Code: ${error.code})` };
    }

    return {
      success: true,
      needsSchema: false,
      message: 'Successfully connected to Supabase database!'
    };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}
