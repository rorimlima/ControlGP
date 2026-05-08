import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Landmark, CreditCard, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { path: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { path: '/lancamentos', label: 'Lançar', icon: ArrowLeftRight },
  { path: '/contas', label: 'Contas', icon: Landmark },
  { path: '/cartoes', label: 'Cartões', icon: CreditCard },
  { path: '/configuracoes', label: 'Config', icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--color-dark-border)]">
      <div className="flex items-center justify-around h-[var(--spacing-bottom-nav)] px-2">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute -top-0.5 w-8 h-[3px] rounded-b-full bg-blue-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <Icon
                className={cn(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-500'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-500'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>

      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
