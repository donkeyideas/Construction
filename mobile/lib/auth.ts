import { create } from 'zustand';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface UserCompany {
  userId: string;
  companyId: string;
  companyName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  userCompany: UserCompany | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    industryType: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  fetchUserCompany: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  userCompany: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user, session, loading: false, initialized: true });
        await get().fetchUserCompany();
      } else {
        set({ user: null, session: null, loading: false, initialized: true });
      }
    } catch {
      set({ loading: false, initialized: true });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
      if (session?.user) {
        get().fetchUserCompany();
      } else {
        set({ userCompany: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) return { error: error.message };
    return { error: null };
  },

  signUp: async ({ email, password, fullName, companyName, industryType }) => {
    set({ loading: true });
    try {
      const res = await fetch(
        'https://construction-gamma-six.vercel.app/api/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            company_name: companyName,
            company_slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            industry_type: industryType,
            accepted_terms: true,
            subscription_plan: 'starter',
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        set({ loading: false });
        return { error: json.error || 'Registration failed' };
      }
      // Auto sign-in after registration
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      set({ loading: false });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      set({ loading: false });
      return { error: (err as Error).message };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, userCompany: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
  },

  fetchUserCompany: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id, role, companies(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (membership) {
      const companyName =
        (membership.companies as unknown as { name: string } | null)?.name ?? '';
      set({
        userCompany: {
          userId: user.id,
          companyId: membership.company_id,
          companyName,
          role: membership.role,
        },
      });
    }
  },
}));
