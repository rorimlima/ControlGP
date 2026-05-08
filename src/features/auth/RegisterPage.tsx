import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const registerSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { signUp, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    const result = await signUp({
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      password: data.password,
    });
    if (result.error) {
      if (result.error === 'ACCESS_DENIED') {
        navigate('/acesso-negado');
        return;
      }
      setError(result.error);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <h2 className="text-lg font-bold text-white mb-1">Criar Conta</h2>
      <p className="text-sm text-slate-500 mb-6">Preencha seus dados para começar</p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-lg bg-red-500/8 border border-red-500/15 text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Nome completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input {...register('nome')} placeholder="Seu nome" className="input-field pl-10" />
          </div>
          {errors.nome && <p className="text-xs text-red-400 mt-1">{errors.nome.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input {...register('email')} type="email" placeholder="seu@email.com" className="input-field pl-10" autoComplete="email" />
          </div>
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input {...register('telefone')} placeholder="(11) 99999-9999" className="input-field pl-10" />
          </div>
          {errors.telefone && <p className="text-xs text-red-400 mt-1">{errors.telefone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field pl-10 pr-10"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 p-0.5">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirmar senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              {...register('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field pl-10"
            />
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Criar conta'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Já tem conta?{' '}
        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  );
}
