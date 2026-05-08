import { Outlet, Navigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen gradient-dark gradient-mesh flex">
      {/* Left Panel — Branding (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent" />
        
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-8 shadow-lg" style={{ boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)' }}>
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Control <span className="text-blue-400">GP</span>
          </h1>
          <p className="text-lg text-slate-400 mb-8">
            Gestão Financeira Pessoal Inteligente
          </p>

          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { title: 'Offline-First', desc: 'Funciona sem internet' },
              { title: 'Multi-Device', desc: 'Sincronização automática' },
              { title: 'Seguro', desc: 'Criptografia enterprise' },
              { title: 'Inteligente', desc: 'Análises e projeções' },
            ].map((feat) => (
              <div key={feat.title} className="glass-light rounded-xl p-4">
                <p className="text-sm font-semibold text-white">{feat.title}</p>
                <p className="text-xs text-slate-400 mt-1">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Control <span className="text-blue-400">GP</span>
            </h1>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
