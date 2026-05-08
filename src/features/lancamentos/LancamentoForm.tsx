import { useState } from 'react';
import { motion } from 'framer-motion';
import { db, type LocalLancamento, type LocalCategoria, type LocalConta } from '@/lib/database';
import { addToSyncQueue } from '@/lib/sync-engine';
import { generateId, cn } from '@/lib/utils';

interface Props {
  editData: LocalLancamento | null;
  onClose: () => void;
  categorias: LocalCategoria[];
  contas: LocalConta[];
  profile: { id: string; tenant_id: string };
}

export default function LancamentoForm({ editData, onClose, categorias, contas, profile }: Props) {
  const [form, setForm] = useState({
    tipo: editData?.tipo || 'despesa' as 'receita' | 'despesa' | 'transferencia',
    descricao: editData?.descricao || '',
    valor: editData ? String(editData.valor) : '',
    data_competencia: editData?.data_competencia || new Date().toISOString().split('T')[0],
    data_vencimento: editData?.data_vencimento || new Date().toISOString().split('T')[0],
    status: (editData?.status || 'pendente') as 'pendente' | 'pago',
    categoria_id: editData?.categoria_id || '',
    conta_id: editData?.conta_id || '',
    forma_pagamento: editData?.forma_pagamento || 'pix',
    observacoes: editData?.observacoes || '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.descricao || !form.valor) return;
    const now = new Date().toISOString();
    const id = editData?.id || generateId();

    const record: LocalLancamento = {
      id,
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      tipo: form.tipo,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      data_competencia: form.data_competencia,
      data_vencimento: form.data_vencimento,
      data_pagamento: form.status === 'pago' ? now.split('T')[0] : undefined,
      status: form.status,
      categoria_id: form.categoria_id || undefined,
      conta_id: form.conta_id || undefined,
      forma_pagamento: form.forma_pagamento,
      parcelado: false,
      recorrente: false,
      tags: [],
      observacoes: form.observacoes,
      created_at: editData?.created_at || now,
      updated_at: now,
      version: (editData?.version || 0) + 1,
      sync_status: 'pending',
    };

    await db.lancamentos.put(record);
    const { sync_status, last_synced_at, ...payload } = record;
    await addToSyncQueue('lancamentos', id, editData ? 'update' : 'insert', payload as any);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-2xl">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">{editData ? 'Editar' : 'Novo'} Lançamento</h2>

          <div className="flex gap-2">
            {(['receita', 'despesa'] as const).map(t => (
              <button key={t} onClick={() => set('tipo', t)} className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all', form.tipo === t ? (t === 'receita' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30') : 'text-slate-400 border-[var(--color-dark-border)]')}>
                {t === 'receita' ? 'Receita' : 'Despesa'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Descrição</label>
            <input value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Aluguel" className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Valor</label>
            <input type="number" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" className="input-field text-lg font-bold" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Competência</label>
              <input type="date" value={form.data_competencia} onChange={e => set('data_competencia', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Vencimento</label>
              <input type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoria</label>
              <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)} className="input-field">
                <option value="">Selecionar</option>
                {categorias.filter(c => c.tipo === form.tipo && c.ativo && !c.deleted_at).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Conta</label>
              <select value={form.conta_id} onChange={e => set('conta_id', e.target.value)} className="input-field">
                <option value="">Selecionar</option>
                {contas.filter(c => c.ativo && !c.deleted_at).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {(['pendente', 'pago'] as const).map(s => (
              <button key={s} onClick={() => set('status', s)} className={cn('flex-1 py-2 rounded-xl text-sm font-medium border transition-all', form.status === s ? (s === 'pago' ? 'badge-pago' : 'badge-pendente') : 'text-slate-400 border-[var(--color-dark-border)]')}>
                {s === 'pago' ? 'Pago' : 'Pendente'}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)]">Cancelar</button>
            <button onClick={handleSave} className="btn-primary flex-1 py-3">{editData ? 'Salvar' : 'Criar'}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
