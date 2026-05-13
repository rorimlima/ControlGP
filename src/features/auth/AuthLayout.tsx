import { Outlet, Navigate, Link } from 'react-router-dom';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();

  if (isLoading) return null;
  if (isAuthenticated && profile) {
    const dest = profile.role === 'master' ? '/admin' : '/dashboard';
    return <Navigate to={dest} replace />;
  }

  return (
    <div
      className="gradient-dark gradient-mesh"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Ambient glows animated */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-15%', right: '-10%',
            width: '60vw', height: '60vw',
            background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
          }} 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{
            position: 'absolute', bottom: '-20%', left: '-15%',
            width: '70vw', height: '70vw',
            background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          }} 
        />
      </div>

      {/* Back button */}
      <div style={{ position: 'relative', zIndex: 10, padding: '1rem 1.25rem 0' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.8125rem',
            color: '#3a4d68',
            textDecoration: 'none',
            transition: 'color 0.15s ease',
            padding: '4px 0',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#7a8499')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#3a4d68')}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Voltar
        </Link>
      </div>

      {/* Centered form */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1.25rem',
        position: 'relative',
        zIndex: 10,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44, height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
              boxShadow: '0 6px 20px rgba(59,130,246,0.18)',
              margin: '0 auto 0.875rem',
            }}>
              <TrendingUp style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <h1 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#e2e8f4',
              letterSpacing: '-0.01em',
            }}>
              Control <span style={{ color: '#60a5fa' }}>GP</span>
            </h1>
          </div>

          <Outlet />
        </motion.div>
      </main>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '0.75rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.6875rem', color: '#1a2535' }}>
          © {new Date().getFullYear()} Control GP
        </p>
      </footer>
    </div>
  );
}
