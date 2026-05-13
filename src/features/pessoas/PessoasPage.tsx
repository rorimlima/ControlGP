import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Users, Edit3, Trash2, Printer, Download, Loader2, Check, X, Search, Phone, Mail } from 'lucide-react';
import { db, type LocalPessoa } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { crudInsert, crudUpdate, crudDelete, exportToCSV, printTable } from '@/lib/crud-engine';
import { cn } from '@/lib/utils';

const TIPO_LABELS: Record<string, string> = { pagador: 'Pagar', recebedor: 'Receber', ambos: 'Ambos' };
const TIPO_COLORS: Record<string, string> = { pagador: 'text-red-400 bg-red-500/10 border-red-500/20', recebedor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', ambos: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };

const CSV_COLUMNS = [
  { key: 'nome', label: 'Nome' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'email', label: 'Email' },
  { key: 'pix_chave', label: 'Chave PIX' },
];

export default function PessoasPage() {
  const { profile, user } = useAuthStore();
  const raw = useLiveQuery(() => db.pessoas.toArray()) || [];
  const pessoas = useMemo(() => raw.filter(p => !p.deleted_at && p.ativo), [raw]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<LocalPessoa | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return pessoas;
    const s = search.toLowerCase();
    return pessoas.filter(p => p.nome.toLowerCase().includes(s) || p.cpf_cnpj?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s));
  }, [pessoas, search]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = async (id: string) => {
    const { error } = await crudDelete('pessoas', id);
    if (error) showFeedback('error', error); else showFeedback('success', 'Pessoa removida');
    setDeleteConfirm(null);
  };

  const handleExport = () => {
    const data = filtered.map(p => ({ nome: p.nome, tipo: TIPO_LABELS[p.tipo], cpf_cnpj: p.cpf_cnpj || '', telefone: p.telefone || '', email: p.email || '', pix_chave: p.pix_chave || '' }));
    exportToCSV(data, 'pessoas', CSV_COLUMNS);
    showFeedback('success', 'CSV exportado');
  };

  const handlePrint = () => {
    const data = filtered.map(p => ({ nome: p.nome, tipo: TIPO_LABELS[p.tipo], cpf_cnpj: p.cpf_cnpj || '', telefone: p.telefone || '', email: p.email || '', pix_chave: p.pix_chave || '' }));
    printTable('Relatório de Pessoas', data, CSV_COLUMNS);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn('fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl backdrop-blur-sm',
              feedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}>
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Pessoas</h1>
          <p className="text-sm text-slate-400 mt-1">{filtered.length} contato(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Imprimir"><Printer className="w-4 h-4" /></button>
          <button onClick={handleExport} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Exportar"><Download className="w-4 h-4" /></button>
          <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Nova</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input type="text" placeholder="Buscar por nome, CPF ou email..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center col-span-full">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhuma pessoa cadastrada</p>
          </div>
        ) : filtered.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card p-4 group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.nome}</p>
                  <p className="text-xs text-slate-500 truncate">{p.cpf_cnpj || p.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setEditData(p); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-[var(--color-dark-hover)]"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-2 py-0.5 rounded-lg text-[11px] font-medium border', TIPO_COLORS[p.tipo])}>{TIPO_LABELS[p.tipo]}</span>
              {p.telefone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="w-3 h-3" /> {p.telefone}</span>}
              {p.pix_chave && <span className="text-xs text-slate-500 truncate">PIX: {p.pix_chave}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-400 mb-4">Deseja remover esta pessoa?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)]">Cancelar</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl">Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && <PessoaForm editData={editData} onClose={() => { setShowForm(false); setEditData(null); }} userId={user!.id} tenantId={profile!.tenant_id} onFeedback={showFeedback} />}
      </AnimatePresence>
    </motion.div>
  );
}

function PessoaForm({ editData, onClose, userId, tenantId, onFeedback }: {
  editData: LocalPessoa | null; onClose: () => void; userId: string; tenantId: string;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: editData?.nome || '',
    tipo: editData?.tipo || 'ambos' as 'pagador' | 'recebedor' | 'ambos',
    cpf_cnpj: editData?.cpf_cnpj || '',
    email: editData?.email || '',
    telefone: editData?.telefone || '',
    banco: editData?.banco || '',
    pix_chave: editData?.pix_chave || '',
    observacoes: editData?.observacoes || '',
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome.trim()) return onFeedback('error', 'Nome é obrigatório');
    setSaving(true);
    const payload = {
      nome: form.nome, tipo: form.tipo, cpf_cnpj: form.cpf_cnpj || null, email: form.email || null,
      telefone: form.telefone || null, banco: form.banco || null, pix_chave: form.pix_chave || null,
      observacoes: form.observacoes || null, ativo: true,
    };
    if (editData) {
      const { error } = await crudUpdate('pessoas', editData.id, payload);
      if (error) onFeedback('error', error); else onFeedback('success', 'Pessoa atualizada');
    } else {
      const { error } = await crudInsert('pessoas', payload, userId, tenantId);
      if (error) onFeedback('error', error); else onFeedback('success', 'Pessoa cadastrada');
    }
    setSaving(false); onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">{editData ? 'Editar' : 'Nova'} Pessoa</h2>
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label><input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: João Silva" className="input-field" /></div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo</label>
          <div className="flex gap-2">
            {(['pagador', 'recebedor', 'ambos'] as const).map(t => (
              <button key={t} onClick={() => set('tipo', t)} className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all', form.tipo === t ? TIPO_COLORS[t] : 'text-slate-400 border-[var(--color-dark-border)]')}>
                {TIPO_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">CPF/CNPJ</label><input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone</label><input value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-9999" className="input-field" /></div>
        </div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Banco</label><input value={form.banco} onChange={e => set('banco', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Chave PIX</label><input value={form.pix_chave} onChange={e => set('pix_chave', e.target.value)} className="input-field" /></div>
        </div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Observações</label><textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} className="input-field resize-none" /></div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)]">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {saving ? 'Salvando...' : editData ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
