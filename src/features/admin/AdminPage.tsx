import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Shield, Trash2, ToggleLeft, ToggleRight,
  TrendingUp, LogOut, Check, X, Mail, User, Phone, Crown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface UsuarioAutorizado {
  id: string;
  email: string;
  nome: string | null;
  telefone: string | null;
  status: 'ativo' | 'inativo' | 'bloqueado';
  plano: 'basico' | 'premium' | 'enterprise';
  data_expiracao: string | null;
  observacoes: string | null;
  created_at: string;
}

const ADMIN_EMAIL = 'onaeror@gmail.com';

const planoColors: Record<string, string> = {
  basico: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  premium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inativo: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  bloqueado: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function AdminPage() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UsuarioAutorizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', nome: '', telefone: '', plano: 'basico', observacoes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios_autorizados')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setUsuarios(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchUsuarios();
  }, [isAdmin, navigate, fetchUsuarios]);

  const handleAdd = async () => {
    setError('');
    setSuccess('');
    if (!form.email) { setError('Email é obrigatório'); return; }

    const exists = usuarios.find(u => u.email.toLowerCase() === form.email.toLowerCase());
    if (exists) { setError('Este email já está autorizado'); return; }

    const { error: err } = await supabase.from('usuarios_autorizados').insert({
      email: form.email.toLowerCase().trim(),
      nome: form.nome || null,
      telefone: form.telefone || null,
      plano: form.plano,
      observacoes: form.observacoes || null,
      autorizado_por: user?.id,
    });

    if (err) { setError(err.message); return; }

    setSuccess(`Usuário ${form.email} autorizado com sucesso!`);
    setForm({ email: '', nome: '', telefone: '', plano: 'basico', observacoes: '' });
    setShowForm(false);
    fetchUsuarios();
  };

  const handleToggleStatus = async (usuario: UsuarioAutorizado) => {
    const newStatus = usuario.status === 'ativo' ? 'inativo' : 'ativo';
    await supabase.from('usuarios_autorizados').update({ status: newStatus }).eq('id', usuario.id);
    fetchUsuarios();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('usuarios_autorizados').delete().eq('id', id);
    fetchUsuarios();
  };

  const handleChangePlano = async (id: string, plano: string) => {
    await supabase.from('usuarios_autorizados').update({ plano }).eq('id', id);
    fetchUsuarios();
  };

  const filtered = usuarios.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.nome && u.nome.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.status === 'ativo').length,
    inativos: usuarios.filter(u => u.status !== 'ativo').length,
  };

  if (!isAdmin) return null;

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen gradient-dark gradient-mesh">
      {/* Navbar */}
      <nav className="glass border-b border-[var(--color-dark-border)] h-16 flex items-center px-4 md:px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Control Master <span className="text-purple-400">GP</span></h1>
            <p className="text-[10px] text-slate-500">Painel Administrativo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-dark-hover)]">
            Ir para o App
          </button>
          <button onClick={signOut} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Usuários', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Ativos', value: stats.ativos, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Inativos', value: stats.inativos, icon: X, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
              {success}
              <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header + Search */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold text-white">Usuários Autorizados</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 py-2 text-sm w-48" />
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Autorizar
            </button>
          </div>
        </div>

        {/* User list */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum usuário encontrado</p>
            </div>
          ) : filtered.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card p-4 flex items-center gap-4 group">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', u.email === ADMIN_EMAIL ? 'bg-purple-500/10' : 'bg-blue-500/10')}>
                {u.email === ADMIN_EMAIL ? <Crown className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{u.nome || u.email}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <div className={cn('px-2 py-1 rounded-lg text-xs font-medium border', planoColors[u.plano])}>{u.plano}</div>
              <div className={cn('px-2 py-1 rounded-lg text-xs font-medium border', statusColors[u.status])}>{u.status}</div>
              {u.email !== ADMIN_EMAIL && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <select value={u.plano} onChange={e => handleChangePlano(u.id, e.target.value)} className="input-field py-1 px-2 text-xs w-auto">
                    <option value="basico">Básico</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <button onClick={() => handleToggleStatus(u)} className="p-1.5 rounded-lg hover:bg-[var(--color-dark-hover)] transition-all" title={u.status === 'ativo' ? 'Desativar' : 'Ativar'}>
                    {u.status === 'ativo' ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Autorizar Novo Usuário</h2>
              <p className="text-sm text-slate-400">Adicione o email do cliente que comprou o sistema.</p>

              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="cliente@email.com" className="input-field pl-10" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do cliente" className="input-field pl-10" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-9999" className="input-field pl-10" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Plano</label>
                <select value={form.plano} onChange={e => set('plano', e.target.value)} className="input-field">
                  <option value="basico">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Observações</label>
                <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} placeholder="Notas internas..." className="input-field resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setError(''); }} className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)]">Cancelar</button>
                <button onClick={handleAdd} className="btn-primary flex-1 py-3">Autorizar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
