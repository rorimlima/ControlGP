import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, CreditCard, Edit3, Trash2, Printer, Download, Loader2, Check, X, ChevronRight, FileText } from 'lucide-react';
import { db, type LocalCartao, type LocalLancamento } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { crudInsert, crudUpdate, crudDelete, exportToCSV, printTable } from '@/lib/crud-engine';
import { formatCurrency, cn } from '@/lib/utils';

const CSV_COLUMNS = [
  { key: 'nome', label: 'Nome' },
  { key: 'banco', label: 'Banco' },
  { key: 'bandeira', label: 'Bandeira' },
  { key: 'limite', label: 'Limite' },
  { key: 'disponivel', label: 'Disponível' },
  { key: 'fechamento', label: 'Dia Fecha' },
  { key: 'vencimento', label: 'Dia Vence' },
];

export default function CartoesPage() {
  const { profile, user } = useAuthStore();
  const raw = useLiveQuery(() => db.cartoes.toArray()) || [];
  const cartoes = useMemo(() => raw.filter(c => !c.deleted_at), [raw]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<LocalCartao | null>(null);
  const [viewDetails, setViewDetails] = useState<LocalCartao | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = async (id: string) => {
    const { error } = await crudDelete('cartoes', id);
    if (error) showFeedback('error', error);
    else showFeedback('success', 'Cartão removido');
    setDeleteConfirm(null);
  };

  const handleExport = () => {
    const data = cartoes.map(c => ({
      nome: c.nome, banco: c.banco || '', bandeira: c.bandeira.toUpperCase(),
      limite: c.limite.toFixed(2), disponivel: c.limite_disponivel.toFixed(2),
      fechamento: String(c.dia_fechamento), vencimento: String(c.dia_vencimento),
    }));
    exportToCSV(data, 'cartoes', CSV_COLUMNS);
    showFeedback('success', 'CSV exportado');
  };

  const handlePrint = () => {
    const data = cartoes.map(c => ({
      nome: c.nome, banco: c.banco || '', bandeira: c.bandeira.toUpperCase(),
      limite: formatCurrency(c.limite), disponivel: formatCurrency(c.limite_disponivel),
      fechamento: String(c.dia_fechamento), vencimento: String(c.dia_vencimento),
    }));
    printTable('Relatório de Cartões', data, CSV_COLUMNS);
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
      <div className="flex items-center justify-between flex-wrap gap-3 page-header">
        <div><h1 className="text-xl md:text-2xl font-bold text-white">Cartões</h1><p className="text-sm text-slate-400 mt-1">{cartoes.length} cartão(ões)</p></div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Imprimir"><Printer className="w-4 h-4" /></button>
          <button onClick={handleExport} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Exportar CSV"><Download className="w-4 h-4" /></button>
          <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Novo</button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cartoes.length === 0 ? (
          <div className="card p-12 text-center col-span-full">
            <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Adicione seu primeiro cartão</p>
          </div>
        ) : cartoes.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="relative overflow-hidden rounded-2xl p-6 group flex flex-col" style={{ background: `linear-gradient(135deg, ${c.cor}cc 0%, ${c.cor}88 100%)` }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between mb-6">
              <CreditCard className="w-8 h-8 text-white/80" />
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setEditData(c); setShowForm(true); }} className="p-1.5 rounded-lg text-white/70 hover:bg-white/10"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded-lg text-white/70 hover:bg-white/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-lg font-bold text-white mb-1">{c.nome}</p>
            <p className="text-sm text-white/60 mb-4">{c.banco || c.bandeira.toUpperCase()}</p>
            <div className="flex justify-between text-sm">
              <div><p className="text-white/50 text-xs">Limite</p><p className="text-white font-semibold">{formatCurrency(c.limite)}</p></div>
              <div className="text-right"><p className="text-white/50 text-xs">Disponível</p><p className="text-white font-semibold">{formatCurrency(c.limite_disponivel)}</p></div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-white/50 mb-4">
              <span>Fecha dia {c.dia_fechamento}</span>
              <span>Vence dia {c.dia_vencimento}</span>
            </div>
            
            <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
              <span className="text-[11px] text-white/60 font-medium tracking-wide uppercase">Faturas</span>
              <button onClick={() => setViewDetails(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-xs font-semibold text-white">
                Detalhes <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-400 mb-4">Deseja remover este cartão?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)]">Cancelar</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl">Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <CartaoForm editData={editData} onClose={() => { setShowForm(false); setEditData(null); }} userId={user!.id} tenantId={profile!.tenant_id} onFeedback={showFeedback} />
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {viewDetails && (
          <CartaoDetalhesModal cartao={viewDetails} onClose={() => setViewDetails(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CartaoForm({ editData, onClose, userId, tenantId, onFeedback }: {
  editData: LocalCartao | null; onClose: () => void; userId: string; tenantId: string;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: editData?.nome || '',
    banco: editData?.banco || '',
    bandeira: editData?.bandeira || 'visa',
    limite: editData ? String(editData.limite) : '',
    dia_fechamento: editData ? String(editData.dia_fechamento) : '1',
    dia_vencimento: editData ? String(editData.dia_vencimento) : '10',
    cor: editData?.cor || '#EF4444',
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome.trim()) return onFeedback('error', 'Nome é obrigatório');
    setSaving(true);

    const lim = parseFloat(form.limite || '0');
    const payload = {
      nome: form.nome,
      banco: form.banco || null,
      bandeira: form.bandeira,
      limite: lim,
      limite_disponivel: editData ? editData.limite_disponivel : lim,
      dia_fechamento: parseInt(form.dia_fechamento) || 1,
      dia_vencimento: parseInt(form.dia_vencimento) || 10,
      cor: form.cor,
      icone: 'credit-card',
      ativo: true,
    };

    if (editData) {
      const { error } = await crudUpdate('cartoes', editData.id, payload);
      if (error) onFeedback('error', error); else onFeedback('success', 'Cartão atualizado');
    } else {
      const { error } = await crudInsert('cartoes', payload, userId, tenantId);
      if (error) onFeedback('error', error); else onFeedback('success', 'Cartão criado');
    }
    setSaving(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">{editData ? 'Editar' : 'Novo'} Cartão</h2>
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label><input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Nubank Gold" className="input-field" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Banco</label><input value={form.banco} onChange={e => set('banco', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Bandeira</label>
            <select value={form.bandeira} onChange={e => set('bandeira', e.target.value)} className="input-field">
              <option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="elo">Elo</option><option value="amex">Amex</option><option value="hipercard">Hipercard</option>
            </select>
          </div>
        </div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Limite</label><input type="number" step="0.01" value={form.limite} onChange={e => set('limite', e.target.value)} placeholder="0,00" className="input-field" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Dia Fechamento</label><input type="number" min="1" max="31" value={form.dia_fechamento} onChange={e => set('dia_fechamento', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Dia Vencimento</label><input type="number" min="1" max="31" value={form.dia_vencimento} onChange={e => set('dia_vencimento', e.target.value)} className="input-field" /></div>
        </div>
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

function CartaoDetalhesModal({ cartao, onClose }: { cartao: LocalCartao; onClose: () => void }) {
  const rawLancamentos = useLiveQuery(
    () => db.lancamentos
      .where('cartao_id')
      .equals(cartao.id)
      .toArray(),
    [cartao.id]
  ) || [];

  const faturas = useMemo(() => {
    // Only pendente (not paid) and not deleted
    const valid = rawLancamentos.filter(l => !l.deleted_at && l.status === 'pendente');
    
    // Group by YYYY-MM
    const groups: Record<string, number> = {};
    valid.forEach(l => {
      // Assuming data_vencimento is YYYY-MM-DD
      const monthYear = l.data_vencimento ? l.data_vencimento.substring(0, 7) : 'S/ Data';
      groups[monthYear] = (groups[monthYear] || 0) + l.valor;
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => {
        // Format to MM/YYYY
        if (mes.length === 7) {
          const [y, m] = mes.split('-');
          return { label: `${m}/${y}`, valor };
        }
        return { label: mes, valor };
      });
  }, [rawLancamentos]);

  const total = faturas.reduce((acc, f) => acc + f.valor, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card w-full max-w-sm rounded-2xl p-0 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-5 border-b border-[var(--color-dark-border)] flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${cartao.cor}1a 0%, transparent 100%)` }}>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" style={{ color: cartao.cor }} />
              {cartao.nome}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Faturas pendentes (próximos meses)</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-[var(--color-dark-hover)]"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto">
          {faturas.length === 0 ? (
            <div className="text-center py-8">
              <Check className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Nenhuma fatura pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {faturas.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-dark-hover)] border border-[var(--color-dark-border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Vencimento {f.label}</p>
                      <p className="text-xs text-slate-500">Fatura agrupada</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-red-400">
                    {formatCurrency(f.valor)}
                  </p>
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-[var(--color-dark-border)] flex justify-between items-center">
                <p className="text-sm font-semibold text-slate-300">Total Previsto</p>
                <p className="text-base font-bold text-red-400">{formatCurrency(total)}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
