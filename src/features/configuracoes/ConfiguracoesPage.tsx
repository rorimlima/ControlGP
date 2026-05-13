import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Bell, Shield, Database, Globe, LogOut, User, Loader2, Check, X, Palette, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useAppStore();
  const { profile, user, signOut } = useAuthStore();
  const [editProfile, setEditProfile] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nome: profile?.nome || '',
    telefone: profile?.telefone || '',
    moeda: profile?.moeda || 'BRL',
    locale: profile?.locale || 'pt-BR',
    timezone: profile?.timezone || 'America/Sao_Paulo',
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({
        nome: profileForm.nome,
        telefone: profileForm.telefone || null,
        moeda: profileForm.moeda,
        locale: profileForm.locale,
        timezone: profileForm.timezone,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);
      if (error) throw error;
      showFeedback('success', 'Perfil atualizado');
      setEditProfile(false);
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Erro ao salvar');
    }
    setSavingProfile(false);
  };

  const handleLogout = async () => {
    await signOut();
    setShowLogoutConfirm(false);
  };

  const sections = [
    {
      title: 'Perfil', icon: User, items: [
        { label: 'Nome', desc: profile?.nome || '—', action: () => setEditProfile(true) },
        { label: 'Email', desc: profile?.email || '—' },
        { label: 'Telefone', desc: profile?.telefone || '—', action: () => setEditProfile(true) },
        { label: 'Função', desc: profile?.role === 'master' ? 'Administrador' : 'Usuário' },
      ],
    },
    {
      title: 'Aparência', icon: Palette, items: [
        {
          label: 'Tema', desc: theme === 'dark' ? 'Escuro' : 'Claro',
          action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
          toggle: true, active: theme === 'dark',
        },
      ],
    },
    {
      title: 'Regional', icon: Globe, items: [
        { label: 'Moeda', desc: profile?.moeda || 'BRL', action: () => setEditProfile(true) },
        { label: 'Localidade', desc: profile?.locale || 'pt-BR', action: () => setEditProfile(true) },
        { label: 'Fuso Horário', desc: profile?.timezone || 'America/Sao_Paulo', action: () => setEditProfile(true) },
      ],
    },
    {
      title: 'Notificações', icon: Bell, items: [
        { label: 'Alertas de vencimento', desc: profile?.notifications_enabled ? 'Ativado' : 'Desativado' },
        { label: 'Alertas de metas', desc: 'Ativado' },
      ],
    },
    {
      title: 'Segurança', icon: Shield, items: [
        { label: 'Autenticação', desc: 'Supabase Auth (JWT)' },
        { label: 'RLS', desc: 'Row Level Security ativo' },
      ],
    },
    {
      title: 'Dados', icon: Database, items: [
        { label: 'Sincronização', desc: 'Automática (30s)' },
        { label: 'Cache local', desc: 'IndexedDB (Dexie.js)' },
        { label: 'Plano', desc: profile?.subscription_status === 'active' ? `Ativo (${profile?.payment_type || 'mensal'})` : 'Inativo' },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn('fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl backdrop-blur-sm',
              feedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}>
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-slate-400 mt-1">Personalize sua experiência</p>
      </div>

      {sections.map((section, si) => {
        const Icon = section.icon;
        return (
          <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }} className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-dark-border)] flex items-center gap-2">
              <Icon className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
            </div>
            <div className="divide-y divide-[var(--color-dark-border)]">
              {section.items.map((item) => (
                <div key={item.label}
                  className={cn('px-5 py-3.5 flex items-center justify-between transition-colors', 'action' in item && item.action ? 'hover:bg-[var(--color-dark-hover)] cursor-pointer' : '')}
                  onClick={'action' in item && item.action ? item.action : undefined}>
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">{item.desc}</span>
                    {'toggle' in item && (
                      <div className={cn('w-10 h-5.5 rounded-full relative transition-colors', (item as any).active ? 'bg-blue-500' : 'bg-slate-700')}>
                        <div className={cn('absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-md transition-all', (item as any).active ? 'left-5' : 'left-0.5')} />
                      </div>
                    )}
                    {'action' in item && item.action && !('toggle' in item) && <ChevronRight className="w-4 h-4 text-slate-600" />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Logout Button */}
      <motion.button
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full card p-4 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/5 border border-red-500/10 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Sair da Conta</span>
      </motion.button>

      {/* Logout Confirm */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowLogoutConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Sair da Conta</h3>
              <p className="text-sm text-slate-400 mb-4">Deseja realmente sair? Dados locais serão mantidos.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)]">Cancelar</button>
                <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all">Sair</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && setEditProfile(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Editar Perfil</h2>
              <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label><input value={profileForm.nome} onChange={e => setProfileForm(p => ({ ...p, nome: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone</label><input value={profileForm.telefone} onChange={e => setProfileForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-9999" className="input-field" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Moeda</label>
                  <select value={profileForm.moeda} onChange={e => setProfileForm(p => ({ ...p, moeda: e.target.value }))} className="input-field">
                    <option value="BRL">BRL (R$)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Localidade</label>
                  <select value={profileForm.locale} onChange={e => setProfileForm(p => ({ ...p, locale: e.target.value }))} className="input-field">
                    <option value="pt-BR">pt-BR</option><option value="en-US">en-US</option><option value="es-ES">es-ES</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Fuso Horário</label>
                <select value={profileForm.timezone} onChange={e => setProfileForm(p => ({ ...p, timezone: e.target.value }))} className="input-field">
                  <option value="America/Sao_Paulo">São Paulo (GMT-3)</option><option value="America/Manaus">Manaus (GMT-4)</option><option value="America/Belem">Belém (GMT-3)</option><option value="America/Fortaleza">Fortaleza (GMT-3)</option><option value="America/Recife">Recife (GMT-3)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditProfile(false)} className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)]">Cancelar</button>
                <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {savingProfile ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
