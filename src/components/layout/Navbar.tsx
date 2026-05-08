import { Menu, Bell, Search, Wifi, WifiOff, RefreshCw, User } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { fullSync } from '@/lib/sync-engine';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { isMobile, isOnline, isSyncing, sidebarCollapsed, toggleSidebar, setIsSyncing } = useAppStore();
  const { profile, signOut } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await fullSync();
    } catch (error) {
      console.error('[Sync] Manual sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-[var(--spacing-navbar)] z-30 glass border-b border-[var(--color-dark-border)] transition-all duration-300',
        isMobile ? 'left-0' : sidebarCollapsed ? 'left-[var(--spacing-sidebar-collapsed)]' : 'left-[var(--spacing-sidebar)]'
      )}
    >
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Search — Desktop */}
          {!isMobile && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar..."
                className="input-field pl-10 py-2 w-64 text-sm"
              />
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Online Status */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
              isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            )}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Manual Sync */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--color-dark-hover)] transition-all"
            >
              <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              {!isMobile && (
                <span className="text-sm font-medium text-slate-300 max-w-[120px] truncate">
                  {profile?.nome || 'Usuário'}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 glass rounded-xl border border-[var(--color-dark-border)] p-1 shadow-lg"
                >
                  <button
                    onClick={() => { signOut(); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    Sair da conta
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
