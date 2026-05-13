import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Users,
  Tags,
  CreditCard,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
  { path: '/contas', label: 'Contas', icon: Landmark },
  { path: '/pessoas', label: 'Pessoas', icon: Users },
  { path: '/categorias', label: 'Categorias', icon: Tags },
  { path: '/cartoes', label: 'Cartões', icon: CreditCard },
  { path: '/metas', label: 'Metas', icon: Target },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapse } = useAppStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const isAdmin = user?.email === 'onaeror@gmail.com';

  const allNavItems = isAdmin
    ? [...navItems, { path: '/admin', label: 'Admin Master', icon: Shield }]
    : navItems;

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full z-40 transition-all duration-300',
        'border-r border-[var(--color-dark-border)] glass',
        sidebarCollapsed ? 'w-[var(--spacing-sidebar-collapsed)]' : 'w-[var(--spacing-sidebar)]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center px-5 border-b border-[var(--color-dark-border)]" style={{ height: 'var(--spacing-navbar)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-lg font-bold text-white">
                  Control <span className="text-blue-400">GP</span>
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {allNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'text-white bg-blue-600/15 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-blue-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />

              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-[var(--color-dark-border)]">
        <button
          onClick={toggleSidebarCollapse}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all text-sm"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
