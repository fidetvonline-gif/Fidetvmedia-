/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { safeLocalStorage } from './storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

// Note: If you don't have Supabase credentials yet, these will be undefined
// and most Supabase calls will fail. The app will show a setup message.
let supabaseClient: any = null;

const dummyClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
    signUp: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ 
      eq: () => ({ single: async () => ({ data: null, error: 'Supabase not configured' }) }),
      maybeSingle: async () => ({ data: null, error: 'Supabase not configured' }),
    }),
    insert: () => ({ select: async () => ({ data: null, error: 'Supabase not configured' }) }),
    update: async () => ({ data: null, error: 'Supabase not configured' }),
    delete: async () => ({ data: null, error: 'Supabase not configured' }),
    eq: () => ({ eq: () => ({ delete: async () => ({ data: null, error: 'Supabase not configured' }) }) }),
  }),
  storage: {
    from: () => ({
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  getChannels: () => [],
  removeChannel: () => {},
};

export const getSupabase = () => {
  console.log('DEBUG: import.meta.env keys:', Object.keys(import.meta.env));
  console.log('DEBUG: VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('DEBUG: VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'fidetv-auth-token',
        storage: safeLocalStorage,
        lock: async (name, acquireTimeout, fn) => {
          // Bypass navigator.locks completely in nested iframe development sandboxes 
          // to prevent multi-tab permission limits and lock-stealing error prompts.
          return fn();
        }
      }
    });
  }
  return supabaseClient || dummyClient;
};

export const supabase = getSupabase();
