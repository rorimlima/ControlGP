import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, ArrowUpRight, ArrowDownRight, Calendar, Check, Clock, XCircle, Edit3, Trash2 } from 'lucide-react';
import { db, type LocalLancamento } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { addToSyncQueue } from '@/lib/sync-engine';
import { formatCurrency, formatDate, generateId, cn } from '@/lib/utils';
import LancamentoForm from './LancamentoForm';

const statusConfig: Record<string, { label: string; cls: string; icon: typeof Check }> = {
  pendente: { label: 'Pendente', cls: 'badge-pendente', icon: Clock },
  pago: { label: 'Pago', cls: 'badge-pago', icon: Check },
  vencido: { label: 'Vencido', cls: 'badge-vencido', icon: XCircle },
  cancelado: { label: 'Cancelado', cls: 'badge-cancelado', icon: XCircle },
};

export default function LancamentosPage() {
  const { profile } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<LocalLancamento | null>(null);

  const categorias = useLiveQuery(() => db.categorias.toArray()) || [];
  const contas = useLiveQuery(() => db.contas.toArray()) || [];
  const rawLancamentos = useLiveQuery(() => db.lancamentos.toArray()) || [];
  const lancamentos = useMemo(() => rawLancamentos.filter(l => !l.deleted_at), [rawLancamentos]);

  const filtered = useMemo(() => {
    return lancamentos.filter(l => {
      if (search && !l.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'todos' && l.status !== statusFilter) return false;
      if (tipoFilter !== 'todos' && l.tipo !== tipoFilter) return false;
      return true;
    }).sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento));
  }, [lancamentos, search, statusFilter, tipoFilter]);

  const handlePagar = async (id: string) => {
    const now = new Date().toISOString();
    await db.lancamentos.update(id, { status: 'pago', data_pagamento: now.split('T')[0], updated_at: now, sync_status: 'pending' });
    await addToSyncQueue('lancamentos', id, 'update', { status: 'pago', data_pagamento: now.split('T')[0] });
  };

  const handleDelete = async (id: string) => {
    const now = new Date().toISOString();
    await db.lancamentos.update(id, { deleted_at: now, sync_status: 'pending' });
    await addToSyncQueue('lancamentos', id, 'delete', { deleted_at: now });
  };

  const getCatName = (id?: string) => categorias.find(c => c.id === id)?.nome || '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Lançamentos</h1>
          <p className="text-sm text-slate-400 mt-1">{filtered.length} lançamento(s)</p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 py-2 text-sm" />
        </div>
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} className="input-field py-2 text-sm w-auto">
          <option value="todos">Todos tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field py-2 text-sm w-auto">
          <option value="todos">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum lançamento encontrado</p>
          </div>
        ) : filtered.map((l, i) => {
          const st = statusConfig[l.status] || statusConfig.pendente;
          const StIcon = st.icon;
          return (
            <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="card p-4 flex items-center gap-4 group">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', l.tipo === 'receita' ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                {l.tipo === 'receita' ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : <ArrowDownRight className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{l.descricao}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(l.data_vencimento)} {getCatName(l.categoria_id) && `• ${getCatName(l.categoria_id)}`}</p>
              </div>
              <div className={cn('px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1', st.cls)}>
                <StIcon className="w-3 h-3" /><span className="hidden sm:inline">{st.label}</span>
              </div>
              <p className={cn('text-sm font-bold min-w-[90px] text-right', l.tipo === 'receita' ? 'text-emerald-400' : 'text-red-400')}>
                {l.tipo === 'despesa' ? '- ' : '+ '}{formatCurrency(l.valor)}
              </p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {l.status === 'pendente' && <button onClick={() => handlePagar(l.id)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10"><Check className="w-4 h-4" /></button>}
                <button onClick={() => { setEditData(l); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-[var(--color-dark-hover)]"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(l.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showForm && <LancamentoForm editData={editData} onClose={() => { setShowForm(false); setEditData(null); }} categorias={categorias} contas={contas} profile={profile!} />}
      </AnimatePresence>
    </motion.div>
  );
}
