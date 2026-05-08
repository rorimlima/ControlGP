import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, FileText, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

// CPF formatting
function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const schema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z.string().min(14, 'CPF inválido (11 dígitos)'),
  telefone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});
type RegisterForm = z.infer<typeof schema>;

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#6b7e99', marginBottom: '0.375rem',
};
const iconStyle: React.CSSProperties = {
  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
  width: 15, height: 15, color: '#2a3d5a', pointerEvents: 'none',
};
const errorStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem',
};

export default function RegisterPage() {
  const { signUp, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
  });

  const cpfValue = watch('cpf') || '';

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    const result = await signUp({
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      password: data.password,
    });
    if (result.error) {
      if (result.error === 'ACCESS_DENIED') { navigate('/acesso-negado'); return; }
      setError(result.error);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{
      background: '#121929', border: '1px solid #1a2236', borderRadius: 14, padding: '1.75rem',
    }}>
      <h2 style={{
        fontSize: '1.0625rem', fontWeight: 700, color: '#e2e8f4', marginBottom: '0.25rem', letterSpacing: '-0.01em',
      }}>Criar Conta</h2>
      <p style={{ fontSize: '0.8125rem', color: '#4a5e7a', marginBottom: '1.5rem' }}>
        Preencha seus dados para começar
      </p>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{ marginBottom: '1.25rem', padding: '0.625rem 0.875rem', borderRadius: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.8125rem' }}
          >{error}</motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Nome */}
        <div>
          <label style={labelStyle}>Nome completo</label>
          <div style={{ position: 'relative' }}>
            <User style={iconStyle} />
            <input {...register('nome')} placeholder="Seu nome" className="input-field" style={{ paddingLeft: 36 }} autoComplete="name" />
          </div>
          {errors.nome && <p style={errorStyle}>{errors.nome.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Email</label>
          <div style={{ position: 'relative' }}>
            <Mail style={iconStyle} />
            <input {...register('email')} type="email" placeholder="seu@email.com" className="input-field" style={{ paddingLeft: 36 }} autoComplete="email" />
          </div>
          {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
        </div>

        {/* CPF */}
        <div>
          <label style={labelStyle}>CPF</label>
          <div style={{ position: 'relative' }}>
            <FileText style={iconStyle} />
            <input
              {...register('cpf')}
              placeholder="000.000.000-00"
              className="input-field"
              style={{ paddingLeft: 36 }}
              maxLength={14}
              inputMode="numeric"
              onChange={(e) => setValue('cpf', formatCpf(e.target.value), { shouldValidate: true })}
              value={cpfValue}
            />
          </div>
          {errors.cpf && <p style={errorStyle}>{errors.cpf.message}</p>}
        </div>

        {/* Telefone */}
        <div>
          <label style={labelStyle}>Telefone</label>
          <div style={{ position: 'relative' }}>
            <Phone style={iconStyle} />
            <input {...register('telefone')} placeholder="(11) 99999-9999" className="input-field" style={{ paddingLeft: 36 }} autoComplete="tel" />
          </div>
          {errors.telefone && <p style={errorStyle}>{errors.telefone.message}</p>}
        </div>

        {/* Senha */}
        <div>
          <label style={labelStyle}>Senha</label>
          <div style={{ position: 'relative' }}>
            <Lock style={iconStyle} />
            <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="••••••••"
              className="input-field" style={{ paddingLeft: 36, paddingRight: 36 }} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#2a3d5a', padding: 2, display: 'flex', alignItems: 'center' }}>
              {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
            </button>
          </div>
          {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
        </div>

        {/* Confirmar */}
        <div>
          <label style={labelStyle}>Confirmar senha</label>
          <div style={{ position: 'relative' }}>
            <Lock style={iconStyle} />
            <input {...register('confirmPassword')} type={showPw ? 'text' : 'password'} placeholder="••••••••"
              className="input-field" style={{ paddingLeft: 36 }} />
          </div>
          {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary"
          style={{ width: '100%', marginTop: '0.25rem', padding: '12px' }}>
          {isLoading
            ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> Criando...</>
            : 'Criar conta'
          }
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#4a5e7a', marginTop: '1.25rem' }}>
        Já tem conta?{' '}
        <Link to="/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>Entrar</Link>
      </p>
    </div>
  );
}
