import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, ArrowUpRight, ArrowDownRight, Calendar, Check, Clock, XCircle, Edit3, Trash2, Printer, Download, X } from 'lucide-react';
import { db, type LocalLancamento } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { crudUpdate, crudDelete, exportToCSV, printTable } from '@/lib/crud-engine';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import LancamentoForm from './LancamentoForm';

const statusConfig: Record<string, { label: string; cls: string; icon: typeof Check }> = {
  pendente: { label: 'Pendente', cls: 'badge-pendente', icon: Clock },
  pago:     { label: 'Pago',     cls: 'badge-pago',     icon: Check },
  vencido:  { label: 'Vencido',  cls: 'badge-vencido',  icon: XCircle },
  cancelado:{ label: 'Cancelado',cls: 'badge-cancelado',icon: XCircle },
};

const CSV_COLUMNS = [
  { key: 'descricao', label: 'Descrição' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'valor', label: 'Valor' },
  { key: 'data_vencimento', label: 'Vencimento' },
  { key: 'status', label: 'Status' },
  { key: 'forma_pagamento', label: 'Pagamento' },
];

export default function LancamentosPage() {
  const { profile, user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<LocalLancamento | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handlePagar = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await crudUpdate('lancamentos', id, { status: 'pago', data_pagamento: now.split('T')[0] });
    if (error) showFeedback('error', error);
    else showFeedback('success', 'Marcado como pago');
  };

  const handleDelete = async (id: string) => {
    const { error } = await crudDelete('lancamentos', id);
    if (error) showFeedback('error', error);
    else showFeedback('success', 'Lançamento removido');
    setDeleteConfirm(null);
  };

  const handleExport = () => {
    const data = filtered.map(l => ({
      descricao: l.descricao,
      tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa',
      valor: l.valor.toFixed(2),
      data_vencimento: formatDate(l.data_vencimento),
      status: statusConfig[l.status]?.label || l.status,
      forma_pagamento: l.forma_pagamento || '',
    }));
    exportToCSV(data, 'lancamentos', CSV_COLUMNS);
    showFeedback('success', 'CSV exportado');
  };

  const handlePrint = () => {
    const data = filtered.map(l => ({
      descricao: l.descricao,
      tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa',
      valor: formatCurrency(l.valor),
      data_vencimento: formatDate(l.data_vencimento),
      status: statusConfig[l.status]?.label || l.status,
      forma_pagamento: l.forma_pagamento || '',
    }));
    printTable('Relatório de Lançamentos', data, CSV_COLUMNS);
  };

  const getCatName = (id?: string) => categorias.find(c => c.id === id)?.nome || '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 w-full">
      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl backdrop-blur-sm',
              feedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="page-header flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">Lançamentos</h1>
          <p className="text-xs text-slate-400 mt-0.5">{filtered.length} lançamento(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Imprimir">
            <Printer className="w-4 h-4" />
          </button>
          <button onClick={handleExport} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Exportar CSV">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /><span>Novo</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 w-full">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input type="text" placeholder="Buscar lançamento..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} className="input-field w-auto flex-1 min-w-[120px]">
          <option value="todos">Todos tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto flex-1 min-w-[120px]">
          <option value="todos">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-2 w-full">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhum lançamento encontrado</p>
          </div>
        ) : filtered.map((l, i) => {
          const st = statusConfig[l.status] || statusConfig.pendente;
          const StIcon = st.icon;
          const isReceita = l.tipo === 'receita';

          return (
            <motion.div key={l.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }} className="card w-full">
              <div className="flex items-center gap-3 p-3 md:p-4">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', isReceita ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                  {isReceita ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{l.descricao}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {formatDate(l.data_vencimento)}
                    {getCatName(l.categoria_id) && <span> · {getCatName(l.categoria_id)}</span>}
                  </p>
                </div>
                <div className={cn('hidden sm:flex px-2 py-1 rounded-lg text-xs font-medium items-center gap-1 flex-shrink-0', st.cls)}>
                  <StIcon className="w-3 h-3" /><span>{st.label}</span>
                </div>
                <p className={cn('text-sm font-bold flex-shrink-0', isReceita ? 'text-emerald-400' : 'text-red-400')}>
                  {isReceita ? '+' : '-'}{formatCurrency(l.valor)}
                </p>
                <div className="lancamento-actions hidden sm:flex items-center gap-0.5 ml-1">
                  {l.status === 'pendente' && (
                    <button onClick={() => handlePagar(l.id)} title="Marcar como pago" className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setEditData(l); setShowForm(true); }} title="Editar" className="p-2 rounded-lg text-slate-400 hover:bg-[var(--color-dark-hover)] active:scale-95 transition-all">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(l.id)} title="Excluir" className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 active:scale-95 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Mobile status row */}
              <div className="sm:hidden flex items-center justify-between px-3 pb-2.5 -mt-1">
                <div className={cn('flex px-2 py-0.5 rounded-md text-[11px] font-medium items-center gap-1', st.cls)}>
                  <StIcon className="w-3 h-3" /><span>{st.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {l.status === 'pendente' && (
                    <button onClick={() => handlePagar(l.id)} className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 active:scale-95 transition-all">Pagar</button>
                  )}
                  <button onClick={() => { setEditData(l); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-[var(--color-dark-hover)] active:scale-95 transition-all">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(l.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 active:scale-95 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-400 mb-4">Deseja remover este lançamento?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)]">Cancelar</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all">Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <LancamentoForm
            editData={editData}
            onClose={() => { setShowForm(false); setEditData(null); }}
            categorias={categorias}
            contas={contas}
            userId={user!.id}
            tenantId={profile!.tenant_id}
            onFeedback={showFeedback}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
