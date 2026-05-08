import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Landmark, Edit3, Trash2 } from 'lucide-react';
import { db } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { addToSyncQueue } from '@/lib/sync-engine';
import { formatCurrency, generateId, cn } from '@/lib/utils';

export default function ContasPage() {
  const { profile } = useAuthStore();
  const rawContas = useLiveQuery(() => db.contas.toArray()) || [];
  const contas = rawContas.filter(c => !c.deleted_at);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', banco: '', tipo_conta: 'corrente', saldo_inicial: '', cor: '#3B82F6' });

  const saldoTotal = contas.reduce((s, c) => s + c.saldo_atual, 0);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome || !profile) return;
    const now = new Date().toISOString();
    const id = generateId();
    const record = { id, tenant_id: profile.tenant_id, user_id: profile.id, nome: form.nome, banco: form.banco, tipo_conta: form.tipo_conta, saldo_inicial: parseFloat(form.saldo_inicial || '0'), saldo_atual: parseFloat(form.saldo_inicial || '0'), cor: form.cor, icone: 'building-2', conta_principal: contas.length === 0, ativo: true, ordem: contas.length, created_at: now, updated_at: now, version: 1, sync_status: 'pending' as const };
    await db.contas.put(record);
    await addToSyncQueue('contas', id, 'insert', record as any);
    setForm({ nome: '', banco: '', tipo_conta: 'corrente', saldo_inicial: '', cor: '#3B82F6' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const now = new Date().toISOString();
    await db.contas.update(id, { deleted_at: now, sync_status: 'pending' });
    await addToSyncQueue('contas', id, 'delete', { deleted_at: now });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contas Bancárias</h1>
          <p className="text-sm text-slate-400 mt-1">Saldo total: <span className="text-blue-400 font-semibold">{formatCurrency(saldoTotal)}</span></p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Nova</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contas.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.cor}20` }}>
                  <Landmark className="w-5 h-5" style={{ color: c.cor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{c.nome}</p>
                  <p className="text-xs text-slate-500">{c.banco || c.tipo_conta}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-slate-500">Saldo Inicial</span><span className="text-slate-400">{formatCurrency(c.saldo_inicial)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Saldo Atual</span><span className={cn('font-bold', c.saldo_atual >= 0 ? 'text-emerald-400' : 'text-red-400')}>{formatCurrency(c.saldo_atual)}</span></div>
            </div>
            {c.conta_principal && <div className="mt-3 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium inline-block">Principal</div>}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Nova Conta</h2>
              <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label><input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Nubank" className="input-field" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Banco</label><input value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: Nu Pagamentos" className="input-field" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo</label><select value={form.tipo_conta} onChange={e => set('tipo_conta', e.target.value)} className="input-field"><option value="corrente">Corrente</option><option value="poupanca">Poupança</option><option value="investimento">Investimento</option><option value="carteira">Carteira</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Saldo Inicial</label><input type="number" step="0.01" value={form.saldo_inicial} onChange={e => set('saldo_inicial', e.target.value)} placeholder="0,00" className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Cor</label><input type="color" value={form.cor} onChange={e => set('cor', e.target.value)} className="w-full h-10 rounded-xl cursor-pointer bg-transparent" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)]">Cancelar</button>
                <button onClick={handleSave} className="btn-primary flex-1 py-3">Criar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
