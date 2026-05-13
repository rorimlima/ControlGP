import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, LogIn, Shield, Wifi, Smartphone, Lock } from 'lucide-react';

const FEATURE_PILLS = [
  { icon: Shield,     label: 'Seguro' },
  { icon: Wifi,       label: 'Offline-first' },
  { icon: Smartphone, label: 'Instalável' },
  { icon: Lock,       label: 'Criptografado' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const clickCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atalho oculto: 5 cliques rápidos no logo → Admin
  const handleLogoClick = () => {
    clickCount.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (clickCount.current >= 5) {
      clickCount.current = 0;
      navigate('/admin');
      return;
    }

    timerRef.current = setTimeout(() => {
      clickCount.current = 0;
    }, 2500);
  };

  return (
    <div
      className="gradient-dark gradient-mesh"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Ambient glows */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
        }} />
      </div>

      {/* Main — fully centered */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>

          {/* Logo + title */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{ marginBottom: '2.5rem' }}
          >
            <button
              onClick={handleLogoClick}
              aria-label="Control GP"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64, height: 64,
                borderRadius: 18,
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                boxShadow: '0 8px 32px rgba(59,130,246,0.22)',
                border: 'none',
                cursor: 'pointer',
                margin: '0 auto 1.25rem',
                userSelect: 'none',
              }}
            >
              <TrendingUp style={{ width: 28, height: 28, color: '#fff' }} />
            </button>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#e2e8f4',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              Control <span style={{ color: '#60a5fa' }}>GP</span>
            </h1>
            <p style={{
              marginTop: '0.4rem',
              fontSize: '0.8125rem',
              color: 'var(--color-dark-muted)',
              letterSpacing: '0.01em',
            }}>
              Gestão Financeira Pessoal
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
          >
            <Link
              to="/login"
              className="btn-primary"
              style={{ width: '100%', padding: '13px 20px', fontSize: '0.9375rem' }}
            >
              <LogIn style={{ width: 16, height: 16 }} />
              Acessar o sistema
            </Link>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            style={{
              marginTop: '2.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              justifyContent: 'center',
            }}
          >
            {FEATURE_PILLS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 99,
                  fontSize: '0.6875rem',
                  color: '#475872',
                  border: '1px solid var(--color-dark-border)',
                  background: 'rgba(18,25,41,0.6)',
                  letterSpacing: '0.01em',
                }}
              >
                <Icon style={{ width: 11, height: 11 }} />
                {label}
              </span>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        padding: '0.875rem',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.6875rem', color: '#1e2d45', letterSpacing: '0.02em' }}>
          © {new Date().getFullYear()} Control GP — Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
