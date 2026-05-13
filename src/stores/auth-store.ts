import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  telefone?: string;
  avatar_url?: string;
  role: 'master' | 'user';
  theme: string;
  subscription_status: 'active' | 'expired' | 'trial';
  payment_type: 'mensal' | 'anual' | 'brinde';
  expires_at: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role?: string }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<Profile | null>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  isSubscriptionActive: () => boolean;
  isMaster: () => boolean;
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
          } else {
            set({ user: null, session: null, isAuthenticated: false, profile: null });
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
          const cleanEmail = email.toLowerCase().trim();
          console.log('[Auth] Signing in:', cleanEmail);

          const { data, error } = await supabase.auth.signInWithPassword({ 
            email: cleanEmail, 
            password 
          });
          
          if (error) {
            console.error('[Auth] SignIn error:', error.message);
            return { error: error.message };
          }

          console.log('[Auth] Auth OK, user:', data.user.id);

          // Set session immediately so RLS policies work
          set({ user: data.user, session: data.session, isAuthenticated: true });

          // Fetch profile to check role & subscription
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

          if (profileErr) {
            console.error('[Auth] Profile fetch error:', profileErr.message, profileErr.code);
          }

          if (!profileData) {
            console.error('[Auth] No profile found for user:', data.user.id);
            await supabase.auth.signOut();
            set({ isAuthenticated: false, user: null, session: null, profile: null });
            return { error: 'PROFILE_NOT_FOUND' };
          }

          const profile = profileData as Profile;
          console.log('[Auth] Profile loaded, role:', profile.role, 'payment:', profile.payment_type);

          // Check subscription expiration (skip for 'brinde')
          if (profile.payment_type !== 'brinde' && profile.expires_at) {
            const expiresAt = new Date(profile.expires_at);
            if (expiresAt < new Date()) {
              await supabase
                .from('profiles')
                .update({ subscription_status: 'expired' })
                .eq('user_id', data.user.id);
              
              profile.subscription_status = 'expired';
            }
          }

          // Check authorization via usuarios_autorizados
          const { data: authData, error: checkErr } = await supabase
            .from('usuarios_autorizados')
            .select('status')
            .eq('email', cleanEmail)
            .single();

          if (checkErr) {
            console.error('[Auth] Authorization check error:', checkErr.message);
          }

          if (!authData || authData.status !== 'ativo') {
            console.error('[Auth] Access denied for:', cleanEmail, 'status:', authData?.status);
            await supabase.auth.signOut();
            set({ isAuthenticated: false, user: null, session: null, profile: null });
            return { error: 'ACCESS_DENIED' };
          }

          set({ profile });
          console.log('[Auth] Login complete → role:', profile.role);
          
          return { error: null, role: profile.role };
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
        if (!user) return null;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          const profile = data as Profile;
          set({ profile });
          return profile;
        }
        return null;
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

      isSubscriptionActive: () => {
        const profile = get().profile;
        if (!profile) return false;
        if (profile.role === 'master') return true;
        if (profile.payment_type === 'brinde') return true;
        if (!profile.expires_at) return true;
        return new Date(profile.expires_at) > new Date();
      },

      isMaster: () => {
        return get().profile?.role === 'master';
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
