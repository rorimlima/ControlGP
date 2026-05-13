import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
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
      const errorMsg = result.error === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : 'Erro ao entrar. Tente novamente.';
      setError(errorMsg);
      toast.error(errorMsg);
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div style={{
      background: '#121929',
      border: '1px solid #1a2236',
      borderRadius: 14,
      padding: '1.75rem',
    }}>
      <h2 style={{
        fontSize: '1.0625rem',
        fontWeight: 700,
        color: '#e2e8f4',
        marginBottom: '0.25rem',
        letterSpacing: '-0.01em',
      }}>
        Entrar
      </h2>
      <p style={{ fontSize: '0.8125rem', color: '#4a5e7a', marginBottom: '1.5rem' }}>
        Acesse sua conta para continuar
      </p>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              marginBottom: '1.25rem',
              padding: '0.625rem 0.875rem',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#f87171',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Email */}
        <div>
          <label style={labelStyle}>Email</label>
          <div style={fieldStyle}>
            <Mail style={iconStyle} />
            <input
              {...register('email')}
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              className="input-field"
              style={{ paddingLeft: 36 }}
            />
          </div>
          {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
        </div>

        {/* Senha */}
        <div>
          <label style={labelStyle}>Senha</label>
          <div style={fieldStyle}>
            <Lock style={iconStyle} />
            <input
              {...register('password')}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="input-field"
              style={{ paddingLeft: 36, paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#2a3d5a',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPw
                ? <EyeOff style={{ width: 15, height: 15 }} />
                : <Eye style={{ width: 15, height: 15 }} />
              }
            </button>
          </div>
          {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
          style={{ width: '100%', marginTop: '0.25rem', padding: '12px' }}
        >
          {isLoading
            ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> Entrando...</>
            : 'Entrar'
          }
        </button>
      </form>
    </div>
  );
}
