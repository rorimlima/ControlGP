import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  isMobile: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: number;
  pendingSyncCount: number;

  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsOnline: (isOnline: boolean) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setSyncProgress: (progress: number) => void;
  setPendingSyncCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: 'dark',
  isMobile: window.innerWidth < 768,
  isOnline: navigator.onLine,
  isSyncing: false,
  syncProgress: 0,
  pendingSyncCount: 0,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  setIsMobile: (isMobile) => set({ isMobile }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setSyncProgress: (syncProgress) => set({ syncProgress }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
}));
