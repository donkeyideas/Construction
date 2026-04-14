import 'react-native-url-polyfill/dist/url-shim';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://myjscxitpumscjnqrepl.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15anNjeGl0cHVtc2NqbnFyZXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NjQzMDEsImV4cCI6MjA1MzE0MDMwMX0.xEmJUPVuLGo8_bMRyKIQy6R72l_FSmEPhQ-XBFvNuRQ';

// SecureStore adapter for Supabase auth token persistence
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore may fail on web or in certain environments
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Base URL for Next.js API calls (operations with business logic)
export const API_BASE_URL = 'https://construction-gamma-six.vercel.app';

// Helper to make authenticated API calls to the Next.js backend
export async function apiCall<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });

    const json = await res.json();
    if (!res.ok) return { data: null, error: json.error || `HTTP ${res.status}` };
    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}
