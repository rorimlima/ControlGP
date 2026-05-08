import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  telefone?: string;
  avatar_url?: string;
  role: string;
  theme: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: { nome: string; email: string; telefone: string; password: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            set({ user: session.user, session, isAuthenticated: true });
            await get().fetchProfile();
          }
          
          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              set({ user: session.user, session, isAuthenticated: true });
              await get().fetchProfile();
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, session: null, profile: null, isAuthenticated: false });
            } else if (event === 'TOKEN_REFRESHED' && session) {
              set({ session });
            }
          });
        } catch (error) {
          console.error('[Auth] Initialize error:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { error: error.message };
          return { error: null };
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async ({ nome, email, telefone, password }) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { nome, telefone },
            },
          });
          if (error) return { error: error.message };
          return { error: null };
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, profile: null, isAuthenticated: false });
      },

      fetchProfile: async () => {
        const user = get().user;
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          set({ profile: data as Profile });
        }
      },

      updateProfile: async (profileData) => {
        const user = get().user;
        if (!user) return;

        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (!error) {
          set({ profile: { ...get().profile!, ...profileData } });
        }
      },
    }),
    {
      name: 'cgp-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
