import { Menu, Bell, Search, Wifi, WifiOff, RefreshCw, User, LogOut } from 'lucide-react';
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

  const sidebarOffset = isMobile
    ? '0px'
    : sidebarCollapsed
    ? 'var(--spacing-sidebar-collapsed)'
    : 'var(--spacing-sidebar)';

  return (
    <header
      className="fixed top-0 right-0 z-30 glass border-b border-[var(--color-dark-border)] transition-all duration-300"
      style={{
        height: 'var(--spacing-navbar)',
        left: sidebarOffset,
        // Ensure the navbar never overflows: width = 100vw - sidebarOffset
        width: `calc(100vw - ${sidebarOffset})`,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <div className="h-full flex items-center justify-between px-3 md:px-5 min-w-0">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Search — Desktop only, shrinks gracefully */}
          {!isMobile && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar..."
                className="input-field pl-9 py-1.5 text-sm"
                style={{ width: 'clamp(120px, 20vw, 220px)', minHeight: 'unset', height: '36px' }}
              />
            </div>
          )}
        </div>

        {/* Right — compact, never wrap */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Online Status */}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap',
              isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            )}
          >
            {isOnline ? <Wifi className="w-3 h-3 flex-shrink-0" /> : <WifiOff className="w-3 h-3 flex-shrink-0" />}
            <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Manual Sync */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            title="Sincronizar dados"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          </button>

          {/* Notifications */}
          <button
            title="Notificações"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--color-dark-hover)] transition-all"
            >
              <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-300 max-w-[90px] truncate hidden sm:block">
                {profile?.nome?.split(' ')[0] || 'Usuário'}
              </span>
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-44 glass rounded-xl border border-[var(--color-dark-border)] p-1 shadow-xl z-50"
                >
                  <div className="px-3 py-2 border-b border-[var(--color-dark-border)] mb-1">
                    <p className="text-xs font-semibold text-white truncate">{profile?.nome || 'Usuário'}</p>
                    <p className="text-[11px] text-slate-500 truncate">{profile?.role === 'master' ? 'Administrador' : 'Usuário'}</p>
                  </div>
                  <button
                    onClick={() => { signOut(); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
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
