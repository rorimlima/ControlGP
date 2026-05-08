import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Target, Trash2 } from 'lucide-react';
import { db } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { addToSyncQueue } from '@/lib/sync-engine';
import { formatCurrency, generateId } from '@/lib/utils';

export default function MetasPage() {
  const { profile } = useAuthStore();
  const raw = useLiveQuery(() => db.metas.toArray()) || [];
  const metas = raw.filter(m => !m.deleted_at);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', valor_alvo: '', data_alvo: '', cor: '#10B981' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome || !form.valor_alvo || !profile) return;
    const now = new Date().toISOString();
    const id = generateId();
    const record = {
      id, tenant_id: profile.tenant_id, user_id: profile.id,
      nome: form.nome, valor_alvo: parseFloat(form.valor_alvo), valor_atual: 0,
      data_inicio: now.split('T')[0], data_alvo: form.data_alvo, cor: form.cor,
      icone: 'target', status: 'em_andamento' as const,
      created_at: now, updated_at: now, version: 1, sync_status: 'pending' as const,
    };
    await db.metas.put(record);
    await addToSyncQueue('metas', id, 'insert', record as any);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const now = new Date().toISOString();
    await db.metas.update(id, { deleted_at: now, sync_status: 'pending' });
    await addToSyncQueue('metas', id, 'delete', { deleted_at: now });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Metas</h1>
          <p className="text-sm text-slate-400 mt-1">{metas.length} meta(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metas.map((m, i) => {
          const prog = m.valor_alvo > 0 ? Math.min((m.valor_atual / m.valor_alvo) * 100, 100) : 0;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="card p-5 group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${m.cor}20` }}>
                    <Target className="w-5 h-5" style={{ color: m.cor }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.nome}</p>
                    <p className="text-xs text-slate-500">
                      Até {m.data_alvo ? new Date(m.data_alvo).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">{formatCurrency(m.valor_atual)}</span>
                <span className="text-slate-300 font-semibold">{formatCurrency(m.valor_alvo)}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }}
                  transition={{ duration: 0.8 }} className="h-full rounded-full"
                  style={{ backgroundColor: m.cor }} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 text-right">{prog.toFixed(1)}%</p>
            </motion.div>
          );
        })}
        {metas.length === 0 && (
          <div className="card p-12 text-center col-span-full">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Crie sua primeira meta financeira</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Nova Meta</h2>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Nome</label>
                <input value={form.nome} onChange={e => set('nome', e.target.value)}
                  placeholder="Ex: Reserva de emergência" className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Valor Alvo</label>
                <input type="number" value={form.valor_alvo} onChange={e => set('valor_alvo', e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Data Alvo</label>
                <input type="date" value={form.data_alvo} onChange={e => set('data_alvo', e.target.value)}
                  className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-[var(--color-dark-border)]">
                  Cancelar
                </button>
                <button onClick={handleSave} className="btn-primary flex-1 py-3">Criar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
