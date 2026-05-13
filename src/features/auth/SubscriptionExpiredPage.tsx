import { motion } from 'framer-motion';
import { AlertTriangle, LogOut, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionExpiredPage() {
  const { signOut, profile } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div
      className="gradient-dark gradient-mesh"
      style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64, height: 64,
          borderRadius: 18,
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.2)',
          margin: '0 auto 1.5rem',
        }}>
          <AlertTriangle style={{ width: 28, height: 28, color: '#f59e0b' }} />
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f4', marginBottom: '0.5rem' }}>
          Assinatura Expirada
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#7a8499', lineHeight: 1.6, marginBottom: '2rem' }}>
          Sua assinatura do <strong style={{ color: '#60a5fa' }}>Control GP</strong> expirou.
          Entre em contato com o administrador para renovar seu acesso.
        </p>

        {profile?.expires_at && (
          <p style={{
            fontSize: '0.75rem',
            color: '#4a5e7a',
            marginBottom: '1.5rem',
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.1)',
          }}>
            Expirou em: {new Date(profile.expires_at).toLocaleDateString('pt-BR')}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <a
            href="mailto:onaeror@gmail.com"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', textDecoration: 'none' }}
          >
            <Mail style={{ width: 15, height: 15 }} /> Contatar Administrador
          </a>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#7a8499',
              border: '1px solid var(--color-dark-border)',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut style={{ width: 14, height: 14 }} /> Sair
          </button>
        </div>
      </motion.div>
    </div>
  );
}
