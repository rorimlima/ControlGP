import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { db } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { addToSyncQueue } from '@/lib/sync-engine';
import { formatCurrency, generateId, cn } from '@/lib/utils';

export default function CartoesPage() {
  const { profile } = useAuthStore();
  const raw = useLiveQuery(() => db.cartoes.toArray()) || [];
  const cartoes = raw.filter(c => !c.deleted_at);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', banco: '', bandeira: 'visa', limite: '', dia_fechamento: '1', dia_vencimento: '10', cor: '#EF4444' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome || !profile) return;
    const now = new Date().toISOString();
    const id = generateId();
    const lim = parseFloat(form.limite || '0');
    const record = { id, tenant_id: profile.tenant_id, user_id: profile.id, nome: form.nome, banco: form.banco, bandeira: form.bandeira, limite: lim, limite_disponivel: lim, dia_fechamento: parseInt(form.dia_fechamento), dia_vencimento: parseInt(form.dia_vencimento), cor: form.cor, icone: 'credit-card', ativo: true, created_at: now, updated_at: now, version: 1, sync_status: 'pending' as const };
    await db.cartoes.put(record);
    await addToSyncQueue('cartoes', id, 'insert', record as any);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const now = new Date().toISOString();
    await db.cartoes.update(id, { deleted_at: now, sync_status: 'pending' });
    await addToSyncQueue('cartoes', id, 'delete', { deleted_at: now });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Cartões</h1><p className="text-sm text-slate-400 mt-1">{cartoes.length} cartão(ões)</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Novo</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cartoes.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="relative overflow-hidden rounded-2xl p-6 group" style={{ background: `linear-gradient(135deg, ${c.cor}cc 0%, ${c.cor}88 100%)` }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between mb-6">
              <CreditCard className="w-8 h-8 text-white/80" />
              <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-lg font-bold text-white mb-1">{c.nome}</p>
            <p className="text-sm text-white/60 mb-4">{c.banco || c.bandeira.toUpperCase()}</p>
            <div className="flex justify-between text-sm">
              <div><p className="text-white/50 text-xs">Limite</p><p className="text-white font-semibold">{formatCurrency(c.limite)}</p></div>
              <div className="text-right"><p className="text-white/50 text-xs">Disponível</p><p className="text-white font-semibold">{formatCurrency(c.limite_disponivel)}</p></div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-white/50">
              <span>Fecha dia {c.dia_fechamento}</span>
              <span>Vence dia {c.dia_vencimento}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Novo Cartão</h2>
              <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label><input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Nubank Gold" className="input-field" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Banco</label><input value={form.banco} onChange={e => set('banco', e.target.value)} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Bandeira</label><select value={form.bandeira} onChange={e => set('bandeira', e.target.value)} className="input-field"><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="elo">Elo</option><option value="amex">Amex</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Limite</label><input type="number" step="0.01" value={form.limite} onChange={e => set('limite', e.target.value)} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Dia Fechamento</label><input type="number" min="1" max="31" value={form.dia_fechamento} onChange={e => set('dia_fechamento', e.target.value)} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Dia Vencimento</label><input type="number" min="1" max="31" value={form.dia_vencimento} onChange={e => set('dia_vencimento', e.target.value)} className="input-field" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-[var(--color-dark-border)]">Cancelar</button>
                <button onClick={handleSave} className="btn-primary flex-1 py-3">Criar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
