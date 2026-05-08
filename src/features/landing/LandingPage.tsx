import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, LogIn, Shield, Wifi, Smartphone, Lock } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [adminClicks, setAdminClicks] = useState(0);

  // Hidden admin shortcut: click the logo 5 times
  const handleLogoClick = () => {
    const next = adminClicks + 1;
    setAdminClicks(next);
    if (next >= 5) {
      setAdminClicks(0);
      navigate('/admin');
    }
    // Reset after 3 seconds of no clicks
    setTimeout(() => setAdminClicks(0), 3000);
  };

  return (
    <div className="min-h-[100dvh] gradient-dark gradient-mesh flex flex-col">
      {/* Background subtle effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/[0.03] rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
      </div>

      {/* Main Content — Centered */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-sm text-center">
          {/* Logo — double tap = hidden admin */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <button
              onClick={handleLogoClick}
              className="mx-auto w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mb-5 select-none shadow-lg"
              style={{ boxShadow: '0 8px 32px rgba(59, 130, 246, 0.25)' }}
              aria-label="Control GP"
            >
              <TrendingUp className="w-8 h-8 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Control <span className="text-blue-400">GP</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">Gestão Financeira Pessoal</p>
          </motion.div>

          {/* Access Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="space-y-3"
          >
            <Link
              to="/login"
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2.5 text-[15px]"
            >
              <LogIn className="w-4.5 h-4.5" />
              Acessar o sistema
            </Link>

            <Link
              to="/registro"
              className="block w-full py-3 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all text-center"
            >
              Criar minha conta
            </Link>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
          >
            {[
              { icon: Shield, label: 'Seguro' },
              { icon: Wifi, label: 'Offline-first' },
              { icon: Smartphone, label: 'PWA' },
              { icon: Lock, label: 'Criptografado' },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-slate-500 border border-[var(--color-dark-border)] bg-[var(--color-dark-card)]/50"
              >
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <p className="text-[11px] text-slate-700">
          © {new Date().getFullYear()} Control GP — v1.0.0
        </p>
      </footer>
    </div>
  );
}
