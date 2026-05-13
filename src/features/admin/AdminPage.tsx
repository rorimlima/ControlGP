import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Shield, Trash2, ToggleLeft, ToggleRight,
  LogOut, Check, X, Mail, User, Phone, Crown, Edit2, KeyRound,
  FileText, Loader2, Gift, Calendar, CreditCard,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────
interface UsuarioAutorizado {
  id: string;
  email: string;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  status: 'ativo' | 'inativo' | 'bloqueado';
  plano: 'basico' | 'premium' | 'enterprise';
  data_expiracao: string | null;
  observacoes: string | null;
  created_at: string;
}

type ModalMode = 'create' | 'edit' | null;

const ADMIN_EMAIL = 'onaeror@gmail.com';

const EMPTY_FORM = { email: '', nome: '', cpf: '', telefone: '', plano: 'basico', observacoes: '', payment_type: 'mensal', expires_at: '' };

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

const paymentColors: Record<string, string> = {
  mensal: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  anual: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  brinde: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

// ─── CPF Formatting ──────────────────────────────────
function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function cpfDigitsOnly(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

function isValidCpf(cpf: string): boolean {
  const d = cpfDigitsOnly(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // all same digits
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(d[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(d[10]) === check;
}

// ─── Edge Function caller ────────────────────────────
async function callAdminFunction(action: string, payload: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada');

  const res = await supabase.functions.invoke('admin-create-user', {
    body: { action, ...payload },
  });

  if (res.error) throw new Error(res.error.message || 'Erro na função');
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

// ─── Component ───────────────────────────────────────
export default function AdminPage() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UsuarioAutorizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchUsuarios();
  }, [isAdmin, navigate, fetchUsuarios]);

  // ─── Open modals ─────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalMode('create');
    setError('');
  };

  const openEdit = (u: UsuarioAutorizado) => {
    setForm({
      email: u.email,
      nome: u.nome || '',
      cpf: u.cpf ? formatCpf(u.cpf) : '',
      telefone: u.telefone || '',
      plano: u.plano,
      observacoes: u.observacoes || '',
      payment_type: 'mensal',
      expires_at: '',
    });
    setEditingId(u.id);
    setModalMode('edit');
    setError('');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setError('');
  };

  // ─── Create user ─────────────────────────────────
  const handleCreate = async () => {
    setError('');
    if (!form.email) { setError('Email é obrigatório'); return; }
    if (!form.cpf || !isValidCpf(form.cpf)) { setError('CPF inválido (11 dígitos)'); return; }

    const cpf       = cpfDigitsOnly(form.cpf);
    const emailLower = form.email.toLowerCase().trim();

    // ── Verificação fresh direto do banco (evita stale state) ──
    setSubmitting(true);
    try {
      const { data: freshData } = await supabase
        .from('usuarios_autorizados')
        .select('id, email, cpf')
        .or(`email.eq.${emailLower},cpf.eq.${cpf}`);

      if (freshData && freshData.length > 0) {
        const emailDup = freshData.find(u => u.email.toLowerCase() === emailLower);
        const cpfDup   = freshData.find(u => u.cpf === cpf);
        if (emailDup) { setError('Este email já está cadastrado no sistema'); return; }
        if (cpfDup)   { setError('Este CPF já está cadastrado no sistema'); return; }
      }

      // 1. Insert em usuarios_autorizados
      const { data: inserted, error: dbErr } = await supabase
        .from('usuarios_autorizados')
        .insert({
          email: emailLower,
          nome: form.nome || null,
          cpf,
          telefone: form.telefone || null,
          plano: form.plano,
          observacoes: form.observacoes || null,
          autorizado_por: user?.id,
        })
        .select('id')
        .single();

      if (dbErr) {
        // Código 23505 = unique_violation (constraint duplicata)
        if (dbErr.code === '23505') {
          setError('Este email ou CPF já está cadastrado. Recarregue a lista e tente novamente.');
        } else {
          setError(dbErr.message);
        }
        return;
      }

      // 2. Criar auth user + profile via edge function
      let result: any;
      try {
        result = await callAdminFunction('create', {
          email: emailLower,
          cpf,
          nome: form.nome || '',
          payment_type: form.payment_type || 'mensal',
          expires_at: form.payment_type === 'brinde' ? '' : (form.expires_at || ''),
        });
      } catch (edgeErr: any) {
        // ── ROLLBACK: remove o registro inserido se a edge function falhou ──
        if (inserted?.id) {
          await supabase.from('usuarios_autorizados').delete().eq('id', inserted.id);
        }
        setError(`Erro ao criar autenticação: ${edgeErr.message}. Tente novamente.`);
        return;
      }

      setSuccess(`✅ ${form.nome || emailLower} autorizado! Senha padrão: ${result.password_hint}`);
      closeModal();
      fetchUsuarios();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit user ────────────────────────────────────
  const handleEdit = async () => {
    if (!editingId) return;
    setError('');
    if (!form.cpf || !isValidCpf(form.cpf)) { setError('CPF inválido (11 dígitos)'); return; }

    const cpf = cpfDigitsOnly(form.cpf);

    const cpfConflict = usuarios.find(u => u.cpf === cpf && u.id !== editingId);
    if (cpfConflict) { setError('Este CPF já está cadastrado para outro usuário'); return; }

    setSubmitting(true);
    try {
      const { error: dbErr } = await supabase.from('usuarios_autorizados').update({
        nome: form.nome || null,
        cpf,
        telefone: form.telefone || null,
        plano: form.plano,
        observacoes: form.observacoes || null,
      }).eq('id', editingId);

      if (dbErr) { setError(dbErr.message); return; }

      setSuccess(`✅ Dados de ${form.nome || form.email} atualizados!`);
      closeModal();
      fetchUsuarios();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Reset password ───────────────────────────────
  const handleResetPassword = async (u: UsuarioAutorizado) => {
    if (!u.cpf) { setError(`${u.email} não tem CPF cadastrado. Edite para adicionar.`); return; }

    setSubmitting(true);
    try {
      const result = await callAdminFunction('reset_password', {
        email: u.email,
        cpf: u.cpf,
      });
      setSuccess(`🔑 Senha de ${u.nome || u.email} resetada para: ${result.password_hint}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Toggle status ────────────────────────────────
  const handleToggleStatus = async (u: UsuarioAutorizado) => {
    const newStatus = u.status === 'ativo' ? 'inativo' : 'ativo';
    await supabase.from('usuarios_autorizados').update({ status: newStatus }).eq('id', u.id);
    fetchUsuarios();
  };

  // ─── Delete user ──────────────────────────────────
  const handleDelete = async (u: UsuarioAutorizado) => {
    if (!confirm(`Remover ${u.nome || u.email}? Isso excluirá o acesso ao sistema.`)) return;

    try {
      // Delete from auth
      await callAdminFunction('delete_user', { email: u.email, cpf: u.cpf || '' });
    } catch {
      // auth user may not exist yet, continue
    }

    await supabase.from('usuarios_autorizados').delete().eq('id', u.id);
    setSuccess(`${u.nome || u.email} removido.`);
    fetchUsuarios();
  };

  // ─── Filters ──────────────────────────────────────
  const filtered = usuarios.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.nome && u.nome.toLowerCase().includes(search.toLowerCase())) ||
    (u.cpf && u.cpf.includes(search.replace(/\D/g, '')))
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
      <nav className="glass border-b border-[var(--color-dark-border)] h-14 flex items-center px-4 md:px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Control Master <span className="text-purple-400">GP</span></h1>
            <p style={{ fontSize: '0.625rem' }} className="text-slate-500">Painel Administrativo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')} className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-dark-hover)]">
            Ir para o App
          </button>
          <button onClick={signOut} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Ativos', value: stats.ativos, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Inativos', value: stats.inativos, icon: X, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className="card p-3 md:p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
              {success}
              <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
            </motion.div>
          )}
          {error && !modalMode && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
              {error}
              <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header + Search */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-white">Usuários Autorizados</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Buscar nome, email ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 py-2 text-sm w-52 md:w-64" />
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Novo
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
            <motion.div key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="card p-4 flex items-center gap-3 md:gap-4 group"
            >
              {/* Avatar */}
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', u.email === ADMIN_EMAIL ? 'bg-purple-500/10' : 'bg-blue-500/10')}>
                {u.email === ADMIN_EMAIL ? <Crown className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-blue-400" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{u.nome || u.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  {u.cpf && <p className="text-xs text-slate-600">· CPF: {formatCpf(u.cpf)}</p>}
                </div>
              </div>

              {/* Badges — desktop */}
              <div className="hidden md:flex items-center gap-2">
                <div className={cn('px-2 py-1 rounded-lg text-xs font-medium border', planoColors[u.plano])}>{u.plano}</div>
                <div className={cn('px-2 py-1 rounded-lg text-xs font-medium border', statusColors[u.status])}>{u.status}</div>
              </div>

              {/* Actions */}
              {u.email !== ADMIN_EMAIL && (
                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-[var(--color-dark-hover)] transition-all" title="Editar">
                    <Edit2 className="w-4 h-4 text-slate-400" />
                  </button>
                  <button onClick={() => handleResetPassword(u)} className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-all" title="Resetar Senha (CPF)">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                  </button>
                  <button onClick={() => handleToggleStatus(u)} className="p-1.5 rounded-lg hover:bg-[var(--color-dark-hover)] transition-all" title={u.status === 'ativo' ? 'Desativar' : 'Ativar'}>
                    {u.status === 'ativo' ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                  </button>
                  <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── CREATE / EDIT Modal ──────────────────── */}
      <AnimatePresence>
        {modalMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-lg font-bold text-white">
                {modalMode === 'create' ? 'Autorizar Novo Usuário' : 'Editar Usuário'}
              </h2>
              <p className="text-sm text-slate-400">
                {modalMode === 'create'
                  ? 'CPF obrigatório. A senha será os 6 primeiros dígitos do CPF.'
                  : 'Atualize os dados do usuário.'}
              </p>

              {error && modalMode && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
              )}

              {/* Email (disabled on edit) */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="cliente@email.com"
                    className="input-field pl-10"
                    disabled={modalMode === 'edit'}
                    style={modalMode === 'edit' ? { opacity: 0.5 } : undefined}
                  />
                </div>
              </div>

              {/* CPF */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">CPF * <span className="text-slate-600 text-xs">(senha = 6 primeiros dígitos)</span></label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={form.cpf}
                    onChange={e => set('cpf', formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className="input-field pl-10"
                    maxLength={14}
                    inputMode="numeric"
                  />
                </div>
                {form.cpf && cpfDigitsOnly(form.cpf).length === 11 && (
                  <p className={`text-xs mt-1 ${isValidCpf(form.cpf) ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isValidCpf(form.cpf) ? `✓ CPF válido — Senha: ${cpfDigitsOnly(form.cpf).substring(0, 6)}` : '✗ CPF inválido'}
                  </p>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do cliente" className="input-field pl-10" />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-9999" className="input-field pl-10" />
                </div>
              </div>

              {/* Plano */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Plano</label>
                <select value={form.plano} onChange={e => set('plano', e.target.value)} className="input-field">
                  <option value="basico">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Tipo de Pagamento */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Tipo de Acesso</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select value={form.payment_type} onChange={e => set('payment_type', e.target.value)} className="input-field pl-10">
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                    <option value="brinde">🎁 Brinde (Eterno)</option>
                  </select>
                </div>
                {form.payment_type === 'brinde' && (
                  <p className="text-xs mt-1 text-purple-400">✦ Acesso vitalício — sem data de expiração</p>
                )}
              </div>

              {/* Data de Expiração */}
              {form.payment_type !== 'brinde' && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Data de Expiração</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      value={form.expires_at}
                      onChange={e => set('expires_at', e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Observações</label>
                <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} placeholder="Notas internas..." className="input-field resize-none" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} disabled={submitting} className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)] transition-all">
                  Cancelar
                </button>
                <button
                  onClick={modalMode === 'create' ? handleCreate : handleEdit}
                  disabled={submitting}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
                    : modalMode === 'create' ? 'Autorizar' : 'Salvar'
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
