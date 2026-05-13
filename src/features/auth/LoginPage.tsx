import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type LoginForm = z.infer<typeof loginSchema>;

const fieldStyle: React.CSSProperties = {
  position: 'relative',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#6b7e99',
  marginBottom: '0.375rem',
};

const errorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#f87171',
  marginTop: '0.25rem',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 15,
  height: 15,
  color: '#2a3d5a',
  pointerEvents: 'none',
};

export default function LoginPage() {
  const { signIn, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    const result = await signIn(data.email, data.password);
    if (result.error) {
      if (result.error === 'ACCESS_DENIED') { 
        navigate('/acesso-negado'); 
        return; 
      }
      if (result.error === 'PROFILE_NOT_FOUND') {
        const msg = 'Perfil não encontrado. Contate o administrador.';
        setError(msg);
        toast.error(msg);
        return;
      }
      const errorMsg = result.error === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : 'Erro ao entrar. Tente novamente.';
      setError(errorMsg);
      toast.error(errorMsg);
    } else {
      toast.success('Login realizado com sucesso!');
      // Role-based routing
      if (result.role === 'master') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        background: 'rgba(18, 25, 41, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        borderRadius: 16,
        padding: '2rem',
      }}
    >
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.h2 variants={itemVariants} style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#e2e8f4',
          marginBottom: '0.25rem',
          letterSpacing: '-0.01em',
        }}>
          Bem-vindo de volta
        </motion.h2>
        <motion.p variants={itemVariants} style={{ fontSize: '0.8125rem', color: '#6b7e99', marginBottom: '1.75rem' }}>
          Acesse sua conta para continuar
        </motion.p>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email */}
          <motion.div variants={itemVariants}>
            <label style={labelStyle}>Email</label>
            <div style={fieldStyle}>
              <Mail style={iconStyle} />
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className="input-field"
                style={{ 
                  paddingLeft: 38, 
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
              />
            </div>
            {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
          </motion.div>

          {/* Senha */}
          <motion.div variants={itemVariants}>
            <label style={labelStyle}>Senha</label>
            <div style={fieldStyle}>
              <Lock style={iconStyle} />
              <input
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="input-field"
                style={{ 
                  paddingLeft: 38, paddingRight: 38,
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7e99',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#94a3b8'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7e99'}
              >
                {showPw
                  ? <EyeOff style={{ width: 16, height: 16 }} />
                  : <Eye style={{ width: 16, height: 16 }} />
                }
              </button>
            </div>
            {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
          </motion.div>

          {/* Submit */}
          <motion.div variants={itemVariants} style={{ marginTop: '0.5rem' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ 
                width: '100%', 
                padding: '0.875rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
              }}
            >
              {isLoading
                ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Autenticando...</>
                : 'Entrar'
              }
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </motion.div>
  );
}
