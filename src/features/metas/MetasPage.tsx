import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Target, Edit3, Trash2, Printer, Download, Loader2, Check, X, TrendingUp } from 'lucide-react';
import { db, type LocalMeta } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { crudInsert, crudUpdate, crudDelete, exportToCSV, printTable } from '@/lib/crud-engine';
import { formatCurrency, cn } from '@/lib/utils';

const CSV_COLUMNS = [
  { key: 'nome', label: 'Meta' },
  { key: 'valor_atual', label: 'Atual' },
  { key: 'valor_alvo', label: 'Alvo' },
  { key: 'progresso', label: 'Progresso' },
  { key: 'data_alvo', label: 'Data Alvo' },
  { key: 'status', label: 'Status' },
];

const STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  pausada: 'Pausada',
};

export default function MetasPage() {
  const { profile, user } = useAuthStore();
  const raw = useLiveQuery(() => db.metas.toArray()) || [];
  const metas = useMemo(() => raw.filter(m => !m.deleted_at), [raw]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<LocalMeta | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [depositModal, setDepositModal] = useState<LocalMeta | null>(null);
  const [depositValue, setDepositValue] = useState('');

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = async (id: string) => {
    const { error } = await crudDelete('metas', id);
    if (error) showFeedback('error', error);
    else showFeedback('success', 'Meta removida');
    setDeleteConfirm(null);
  };

  const handleDeposit = async () => {
    if (!depositModal || !depositValue) return;
    const val = parseFloat(depositValue);
    if (val <= 0) return onClose();
    const newAtual = depositModal.valor_atual + val;
    const newStatus = newAtual >= depositModal.valor_alvo ? 'concluida' : depositModal.status;
    const { error } = await crudUpdate('metas', depositModal.id, { valor_atual: newAtual, status: newStatus });
    if (error) showFeedback('error', error);
    else showFeedback('success', `${formatCurrency(val)} adicionado à meta`);
    setDepositModal(null);
    setDepositValue('');
  };

  const onClose = () => { setDepositModal(null); setDepositValue(''); };

  const handleExport = () => {
    const data = metas.map(m => {
      const prog = m.valor_alvo > 0 ? ((m.valor_atual / m.valor_alvo) * 100).toFixed(1) + '%' : '0%';
      return { nome: m.nome, valor_atual: m.valor_atual.toFixed(2), valor_alvo: m.valor_alvo.toFixed(2), progresso: prog, data_alvo: m.data_alvo || '', status: STATUS_LABELS[m.status] || m.status };
    });
    exportToCSV(data, 'metas', CSV_COLUMNS);
    showFeedback('success', 'CSV exportado');
  };

  const handlePrint = () => {
    const data = metas.map(m => {
      const prog = m.valor_alvo > 0 ? ((m.valor_atual / m.valor_alvo) * 100).toFixed(1) + '%' : '0%';
      return { nome: m.nome, valor_atual: formatCurrency(m.valor_atual), valor_alvo: formatCurrency(m.valor_alvo), progresso: prog, data_alvo: m.data_alvo ? new Date(m.data_alvo).toLocaleDateString('pt-BR') : '—', status: STATUS_LABELS[m.status] || m.status };
    });
    printTable('Relatório de Metas', data, CSV_COLUMNS);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Metas</h1>
          <p className="text-sm text-slate-400 mt-1">{metas.length} meta(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Imprimir"><Printer className="w-4 h-4" /></button>
          <button onClick={handleExport} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Exportar CSV"><Download className="w-4 h-4" /></button>
          <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Nova</button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metas.length === 0 ? (
          <div className="card p-12 text-center col-span-full">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Crie sua primeira meta financeira</p>
          </div>
        ) : metas.map((m, i) => {
          const prog = m.valor_alvo > 0 ? Math.min((m.valor_atual / m.valor_alvo) * 100, 100) : 0;
          const isConcluida = m.status === 'concluida';
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5 group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${m.cor}20` }}>
                    <Target className="w-5 h-5" style={{ color: m.cor }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.nome}</p>
                    <p className="text-xs text-slate-500">
                      {m.data_alvo ? `Até ${new Date(m.data_alvo).toLocaleDateString('pt-BR')}` : '—'}
                      {isConcluida && <span className="ml-2 text-emerald-400 font-medium">✓ Concluída</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  {!isConcluida && (
                    <button onClick={() => { setDepositModal(m); setDepositValue(''); }} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10" title="Depositar">
                      <TrendingUp className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setEditData(m); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-[var(--color-dark-hover)]"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirm(m.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">{formatCurrency(m.valor_atual)}</span>
                <span className="text-slate-300 font-semibold">{formatCurrency(m.valor_alvo)}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full" style={{ backgroundColor: m.cor }} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 text-right">{prog.toFixed(1)}%</p>
            </motion.div>
          );
        })}
      </div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-400 mb-4">Deseja remover esta meta?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)]">Cancelar</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl">Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {depositModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card p-6 max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white">Depositar na Meta</h3>
              <p className="text-sm text-slate-400">{depositModal.nome} — {formatCurrency(depositModal.valor_atual)} / {formatCurrency(depositModal.valor_alvo)}</p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Valor</label>
                <input type="number" step="0.01" value={depositValue} onChange={e => setDepositValue(e.target.value)} placeholder="0,00" className="input-field text-lg font-bold" autoFocus />
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)]">Cancelar</button>
                <button onClick={handleDeposit} className="btn-primary flex-1 py-2.5">Depositar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <MetaForm editData={editData} onClose={() => { setShowForm(false); setEditData(null); }} userId={user!.id} tenantId={profile!.tenant_id} onFeedback={showFeedback} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MetaForm({ editData, onClose, userId, tenantId, onFeedback }: {
  editData: LocalMeta | null; onClose: () => void; userId: string; tenantId: string;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: editData?.nome || '',
    descricao: editData?.descricao || '',
    valor_alvo: editData ? String(editData.valor_alvo) : '',
    data_alvo: editData?.data_alvo || '',
    cor: editData?.cor || '#10B981',
    status: editData?.status || 'em_andamento',
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome.trim()) return onFeedback('error', 'Nome é obrigatório');
    if (!form.valor_alvo || parseFloat(form.valor_alvo) <= 0) return onFeedback('error', 'Valor alvo é obrigatório');
    setSaving(true);

    const payload = {
      nome: form.nome,
      descricao: form.descricao || null,
      valor_alvo: parseFloat(form.valor_alvo),
      valor_atual: editData ? editData.valor_atual : 0,
      data_inicio: editData ? editData.data_inicio : new Date().toISOString().split('T')[0],
      data_alvo: form.data_alvo || null,
      cor: form.cor,
      icone: 'target',
      status: form.status,
    };

    if (editData) {
      const { error } = await crudUpdate('metas', editData.id, payload);
      if (error) onFeedback('error', error); else onFeedback('success', 'Meta atualizada');
    } else {
      const { error } = await crudInsert('metas', payload, userId, tenantId);
      if (error) onFeedback('error', error); else onFeedback('success', 'Meta criada');
    }
    setSaving(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">{editData ? 'Editar' : 'Nova'} Meta</h2>
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label><input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Reserva de emergência" className="input-field" /></div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Descrição</label><input value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Opcional" className="input-field" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Valor Alvo *</label><input type="number" step="0.01" value={form.valor_alvo} onChange={e => set('valor_alvo', e.target.value)} placeholder="0,00" className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Data Alvo</label><input type="date" value={form.data_alvo} onChange={e => set('data_alvo', e.target.value)} className="input-field" /></div>
        </div>
        {editData && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="pausada">Pausada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        )}
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Cor</label><input type="color" value={form.cor} onChange={e => set('cor', e.target.value)} className="w-full h-10 rounded-xl cursor-pointer bg-transparent" /></div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)]">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Salvando...' : editData ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
