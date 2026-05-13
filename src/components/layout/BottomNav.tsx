import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Landmark, CreditCard, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { path: '/dashboard',    label: 'Início',   icon: LayoutDashboard },
  { path: '/lancamentos',  label: 'Lançar',   icon: ArrowLeftRight  },
  { path: '/contas',       label: 'Contas',   icon: Landmark        },
  { path: '/cartoes',      label: 'Cartões',  icon: CreditCard      },
  { path: '/configuracoes',label: 'Config',   icon: Settings        },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--color-dark-border)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around h-[var(--spacing-bottom-nav)]">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 px-1 active:scale-95 transition-transform duration-100"
            >
              {/* Active indicator — glowing dot above icon */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute -top-0 w-6 h-[2px] rounded-b-full bg-blue-500"
                  style={{ boxShadow: '0 2px 8px rgba(59,130,246,0.6)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}

              {/* Icon container — pill highlight when active */}
              <div className={cn(
                'flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200',
                isActive ? 'bg-blue-500/12' : ''
              )}>
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all duration-200',
                    isActive
                      ? 'text-blue-400 scale-110'
                      : 'text-slate-500'
                  )}
                />
              </div>

              <span
                className={cn(
                  'text-[10px] font-medium transition-all duration-200 leading-none',
                  isActive ? 'text-blue-400' : 'text-slate-500'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
