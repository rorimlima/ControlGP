import { Outlet, Navigate, Link } from 'react-router-dom';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-[100dvh] gradient-dark gradient-mesh flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/[0.03] rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4" />
      </div>

      {/* Top bar — back button */}
      <div className="relative z-10 px-4 pt-4 sm:px-6 sm:pt-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Link>
      </div>

      {/* Main — centered form */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[400px]"
        >
          {/* Logo header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mb-4 shadow-lg" style={{ boxShadow: '0 6px 24px rgba(59, 130, 246, 0.2)' }}>
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Control <span className="text-blue-400">GP</span>
            </h1>
          </div>

          {/* Form outlet */}
          <Outlet />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center">
        <p className="text-[11px] text-slate-700">© {new Date().getFullYear()} Control GP</p>
      </footer>
    </div>
  );
}
