import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Tags, Edit3, Trash2, Printer, Download, Loader2, Check, X } from 'lucide-react';
import { db, type LocalCategoria } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { crudInsert, crudUpdate, crudDelete, exportToCSV, printTable } from '@/lib/crud-engine';
import { cn } from '@/lib/utils';

const CSV_COLUMNS = [
  { key: 'nome', label: 'Nome' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'cor', label: 'Cor' },
];

export default function CategoriasPage() {
  const { profile, user } = useAuthStore();
  const raw = useLiveQuery(() => db.categorias.toArray()) || [];
  const categorias = useMemo(() => raw.filter(c => !c.deleted_at && c.ativo), [raw]);
  const receitas = useMemo(() => categorias.filter(c => c.tipo === 'receita').sort((a, b) => a.ordem - b.ordem), [categorias]);
  const despesas = useMemo(() => categorias.filter(c => c.tipo === 'despesa').sort((a, b) => a.ordem - b.ordem), [categorias]);

  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<LocalCategoria | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = async (id: string) => {
    const { error } = await crudDelete('categorias', id);
    if (error) showFeedback('error', error);
    else showFeedback('success', 'Categoria removida');
    setDeleteConfirm(null);
  };

  const handleExport = () => {
    const data = categorias.map(c => ({ nome: c.nome, tipo: c.tipo === 'receita' ? 'Receita' : 'Despesa', cor: c.cor }));
    exportToCSV(data, 'categorias', CSV_COLUMNS);
    showFeedback('success', 'CSV exportado');
  };

  const handlePrint = () => {
    const data = categorias.map(c => ({ nome: c.nome, tipo: c.tipo === 'receita' ? 'Receita' : 'Despesa', cor: c.cor }));
    printTable('Relatório de Categorias', data, CSV_COLUMNS);
  };

  const renderGroup = (title: string, items: typeof categorias, color: string) => (
    <div>
      <h2 className={cn('text-sm font-semibold mb-3', color)}>{title} ({items.length})</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card p-4 flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${c.cor}20` }}>
              <Tags className="w-4 h-4" style={{ color: c.cor }} />
            </div>
            <span className="text-sm font-medium text-white flex-1 truncate">{c.nome}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => { setEditData(c); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-[var(--color-dark-hover)]"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
          <h1 className="text-xl md:text-2xl font-bold text-white">Categorias</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie suas categorias financeiras</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Imprimir"><Printer className="w-4 h-4" /></button>
          <button onClick={handleExport} className="p-2.5 rounded-xl border border-[var(--color-dark-border)] text-slate-400 hover:text-white hover:bg-[var(--color-dark-hover)] transition-all" title="Exportar CSV"><Download className="w-4 h-4" /></button>
          <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Nova</button>
        </div>
      </div>

      {/* Groups */}
      {receitas.length === 0 && despesas.length === 0 ? (
        <div className="card p-12 text-center">
          <Tags className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Crie sua primeira categoria</p>
        </div>
      ) : (
        <>
          {renderGroup('Receitas', receitas, 'text-emerald-400')}
          {renderGroup('Despesas', despesas, 'text-red-400')}
        </>
      )}

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-400 mb-4">Deseja remover esta categoria?</p>
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
          <CategoriaForm editData={editData} onClose={() => { setShowForm(false); setEditData(null); }} userId={user!.id} tenantId={profile!.tenant_id} count={categorias.length} onFeedback={showFeedback} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CategoriaForm({ editData, onClose, userId, tenantId, count, onFeedback }: {
  editData: LocalCategoria | null; onClose: () => void; userId: string; tenantId: string; count: number;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: editData?.nome || '',
    tipo: editData?.tipo || 'despesa' as 'receita' | 'despesa',
    cor: editData?.cor || '#6366F1',
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nome.trim()) return onFeedback('error', 'Nome é obrigatório');
    setSaving(true);

    const payload = {
      nome: form.nome,
      tipo: form.tipo,
      cor: form.cor,
      icone: 'tag',
      ordem: editData ? editData.ordem : count,
      ativo: true,
    };

    if (editData) {
      const { error } = await crudUpdate('categorias', editData.id, payload);
      if (error) onFeedback('error', error); else onFeedback('success', 'Categoria atualizada');
    } else {
      const { error } = await crudInsert('categorias', payload, userId, tenantId);
      if (error) onFeedback('error', error); else onFeedback('success', 'Categoria criada');
    }
    setSaving(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">{editData ? 'Editar' : 'Nova'} Categoria</h2>
        <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label><input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Alimentação" className="input-field" /></div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo</label>
          <div className="flex gap-2">
            {(['receita', 'despesa'] as const).map(t => (
              <button key={t} onClick={() => set('tipo', t)} className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all', form.tipo === t ? (t === 'receita' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30') : 'text-slate-400 border-[var(--color-dark-border)]')}>
                {t === 'receita' ? 'Receita' : 'Despesa'}
              </button>
            ))}
          </div>
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
