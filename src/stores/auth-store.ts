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
  isAuthorized: boolean | null; // null = not checked yet

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  checkAuthorization: (email: string) => Promise<boolean>;
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
      isAuthorized: null,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            set({ user: session.user, session, isAuthenticated: true });
            // Check authorization
            const authorized = await get().checkAuthorization(session.user.email!);
            if (authorized) {
              await get().fetchProfile();
            }
          } else {
            set({ user: null, session: null, isAuthenticated: false, isAuthorized: null });
          }
          
          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              set({ user: session.user, session, isAuthenticated: true });
              const authorized = await get().checkAuthorization(session.user.email!);
              if (authorized) {
                await get().fetchProfile();
              }
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, session: null, profile: null, isAuthenticated: false, isAuthorized: null });
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

      checkAuthorization: async (email: string) => {
        try {
          const { data, error } = await supabase
            .from('usuarios_autorizados')
            .select('status')
            .eq('email', email.toLowerCase())
            .single();

          if (error || !data || data.status !== 'ativo') {
            set({ isAuthorized: false });
            return false;
          }

          set({ isAuthorized: true });
          return true;
        } catch {
          set({ isAuthorized: false });
          return false;
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          const cleanEmail = email.toLowerCase().trim();

          // Sign in first
          const { data, error } = await supabase.auth.signInWithPassword({ 
            email: cleanEmail, 
            password 
          });
          
          if (error) return { error: error.message };

          // Now check authorization as the authenticated user
          const { data: authData, error: checkErr } = await supabase
            .from('usuarios_autorizados')
            .select('status')
            .eq('email', cleanEmail)
            .single();

          if (checkErr || !authData || authData.status !== 'ativo') {
            await supabase.auth.signOut();
            set({ 
              isAuthorized: false, 
              isAuthenticated: false, 
              user: null, 
              session: null 
            });
            return { error: 'ACCESS_DENIED' };
          }
          
          set({ 
            user: data.user,
            session: data.session,
            isAuthenticated: true, 
            isAuthorized: true 
          });
          get().fetchProfile();
          
          return { error: null };
        } finally {
          set({ isLoading: false });
        }
      },


      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, profile: null, isAuthenticated: false, isAuthorized: null });
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
        isAuthorized: state.isAuthorized,
      }),
    }
  )
);
