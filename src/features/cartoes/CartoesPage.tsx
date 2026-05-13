import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, CreditCard, Edit3, Trash2, Printer, Download, Loader2, Check, X, ChevronRight, FileText } from 'lucide-react';
import { db, type LocalCartao } from '@/lib/database';
import { useAuthStore } from '@/stores/auth-store';
import { crudInsert, crudUpdate, crudDelete, exportToCSV, printTable } from '@/lib/crud-engine';
import { formatCurrency, cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const rawLancamentos = useLiveQuery(() => db.lancamentos.toArray()) || [];
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

  const getDisponivel = (cartaoId: string, limiteTotal: number) => {
    const pendentes = rawLancamentos.filter(l => !l.deleted_at && l.cartao_id === cartaoId && l.status === 'pendente');
    const consumido = pendentes.reduce((acc, l) => acc + l.valor, 0);
    return Math.max(0, limiteTotal - consumido);
  };

  const handleExport = () => {
    const data = cartoes.map(c => ({
      nome: c.nome, banco: c.banco || '', bandeira: c.bandeira.toUpperCase(),
      limite: c.limite.toFixed(2), disponivel: getDisponivel(c.id, c.limite).toFixed(2),
      fechamento: String(c.dia_fechamento), vencimento: String(c.dia_vencimento),
    }));
    exportToCSV(data, 'cartoes', CSV_COLUMNS);
    showFeedback('success', 'CSV exportado');
  };

  const handlePrint = () => {
    const data = cartoes.map(c => ({
      nome: c.nome, banco: c.banco || '', bandeira: c.bandeira.toUpperCase(),
      limite: formatCurrency(c.limite), disponivel: formatCurrency(getDisponivel(c.id, c.limite)),
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
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="relative rounded-2xl p-5 flex flex-col" style={{ background: `linear-gradient(135deg, ${c.cor}dd 0%, ${c.cor}99 100%)` }}>
            {/* Decorative circle — pointer-events:none so it doesn't block clicks */}
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Card header: icon + always-visible action buttons */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-white leading-tight">{c.nome}</p>
                  <p className="text-xs text-white/60">{c.banco || c.bandeira.toUpperCase()}</p>
                </div>
              </div>
              {/* Actions — always visible, above decorative elements */}
              <div className="flex items-center gap-1 z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditData(c); setShowForm(true); }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/25 transition-all"
                  title="Editar cartão"
                >
                  <Edit3 className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-red-500/40 transition-all"
                  title="Excluir cartão"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* Limit info */}
            <div className="flex justify-between text-sm mb-2">
              <div><p className="text-white/50 text-[11px] uppercase tracking-wide">Limite</p><p className="text-white font-bold">{formatCurrency(c.limite)}</p></div>
              <div className="text-right"><p className="text-white/50 text-[11px] uppercase tracking-wide">Disponível</p><p className="text-white font-bold">{formatCurrency(getDisponivel(c.id, c.limite))}</p></div>
            </div>

            {/* Progress bar */}
            {c.limite > 0 && (() => {
              const usado = c.limite - getDisponivel(c.id, c.limite);
              const pct = Math.min(100, Math.round((usado / c.limite) * 100));
              return (
                <div className="mb-3">
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full rounded-full bg-white/70 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">{pct}% utilizado</p>
                </div>
              );
            })()}

            <div className="flex gap-3 text-[11px] text-white/50 mb-3">
              <span>Fecha dia {c.dia_fechamento}</span>
              <span>·</span>
              <span>Vence dia {c.dia_vencimento}</span>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-white/10 flex justify-between items-center z-10">
              <span className="text-[10px] text-white/50 font-semibold uppercase tracking-widest">Faturas</span>
              <button onClick={() => setViewDetails(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all text-xs font-bold text-white">
                Detalhes <ChevronRight className="w-3 h-3" />
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
    () => db.lancamentos.where('cartao_id').equals(cartao.id).toArray(),
    [cartao.id]
  ) || [];

  const faturas = useMemo(() => {
    const valid = rawLancamentos.filter(l => !l.deleted_at && l.status === 'pendente');
    const groups: Record<string, { total: number; itens: number }> = {};
    valid.forEach(l => {
      const key = l.data_vencimento ? l.data_vencimento.substring(0, 7) : 'S/ Data';
      if (!groups[key]) groups[key] = { total: 0, itens: 0 };
      groups[key].total += l.valor;
      groups[key].itens += 1;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, { total, itens }]) => {
        let label = mes;
        if (mes.length === 7) { const [y, m] = mes.split('-'); label = `${m}/${y}`; }
        return { label, total, itens };
      });
  }, [rawLancamentos]);

  const totalGeral = faturas.reduce((acc, f) => acc + f.total, 0);
  const disponivel = cartao.limite - totalGeral;

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const geradoEm = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTROL GP', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Extrato de Faturas do Cartão', 14, 26);
    doc.text(`Gerado em: ${geradoEm}`, 14, 33);

    // Card info block
    doc.setFillColor(18, 25, 41);
    doc.roundedRect(14, 48, 182, 28, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(cartao.nome, 20, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`${cartao.banco || cartao.bandeira.toUpperCase()} · Fecha dia ${cartao.dia_fechamento} · Vence dia ${cartao.dia_vencimento}`, 20, 67);
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Pendente: ${formatCurrency(totalGeral)}`, 20, 74);

    // Summary row
    const summaryY = 84;
    const cols = [
      { label: 'Limite Total', value: formatCurrency(cartao.limite), color: [100, 116, 139] as [number,number,number] },
      { label: 'Total Faturas', value: formatCurrency(totalGeral), color: [239, 68, 68] as [number,number,number] },
      { label: 'Disponível', value: formatCurrency(Math.max(0, disponivel)), color: [16, 185, 129] as [number,number,number] },
    ];
    const colW = 60;
    cols.forEach((col, idx) => {
      const x = 14 + idx * colW;
      doc.setFillColor(26, 34, 54);
      doc.roundedRect(x, summaryY, 56, 18, 2, 2, 'F');
      doc.setTextColor(...col.color);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(col.value, x + 4, summaryY + 8);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(col.label, x + 4, summaryY + 14);
    });

    // Table
    if (faturas.length > 0) {
      autoTable(doc, {
        startY: summaryY + 26,
        head: [['Vencimento', 'Lançamentos', 'Valor da Fatura']],
        body: [
          ...faturas.map(f => [f.label, `${f.itens} lançamento(s)`, formatCurrency(f.total)]),
          ['', 'TOTAL GERAL', formatCurrency(totalGeral)],
        ],
        headStyles: { fillColor: [15, 23, 42], textColor: [148, 163, 184], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fillColor: [18, 25, 41], textColor: [226, 232, 244], fontSize: 9 },
        alternateRowStyles: { fillColor: [22, 31, 52] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 80 },
          2: { cellWidth: 52, halign: 'right', textColor: [239, 68, 68], fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.row.index === faturas.length) {
            data.cell.styles.fillColor = [15, 23, 42];
            data.cell.styles.fontStyle = 'bold';
            if (data.column.index === 2) data.cell.styles.textColor = [239, 68, 68];
            else data.cell.styles.textColor = [226, 232, 244];
          }
        },
        margin: { left: 14, right: 14 },
      });
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.text('Nenhuma fatura pendente para este cartão.', 14, summaryY + 34);
    }

    // Footer
    const pageH = doc.internal.pageSize.height;
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7);
    doc.text('Control GP — Gestão Financeira Pessoal · control-gp.vercel.app', 14, pageH - 8);

    doc.save(`fatura-${cartao.nome.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card w-full max-w-md rounded-2xl p-0 overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-dark-border)] flex items-center justify-between flex-shrink-0" style={{ background: `linear-gradient(135deg, ${cartao.cor}22 0%, transparent 100%)` }}>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4" style={{ color: cartao.cor }} />
              {cartao.nome}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{cartao.banco || cartao.bandeira.toUpperCase()} · Fecha dia {cartao.dia_fechamento} · Vence dia {cartao.dia_vencimento}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={exportPDF} title="Exportar PDF" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-semibold transition-all">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-[var(--color-dark-hover)] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 p-4 flex-shrink-0 border-b border-[var(--color-dark-border)]">
          <div className="text-center p-2.5 rounded-xl bg-[var(--color-dark-hover)]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Limite</p>
            <p className="text-sm font-bold text-slate-300">{formatCurrency(cartao.limite)}</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Pendente</p>
            <p className="text-sm font-bold text-red-400">{formatCurrency(totalGeral)}</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Disponível</p>
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(Math.max(0, disponivel))}</p>
          </div>
        </div>

        {/* Faturas list */}
        <div className="p-4 overflow-y-auto flex-1">
          {faturas.length === 0 ? (
            <div className="text-center py-10">
              <Check className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nenhuma fatura pendente</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Faturas por vencimento</p>
              {faturas.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-dark-hover)] border border-[var(--color-dark-border)] hover:border-red-500/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Vence {f.label}</p>
                      <p className="text-xs text-slate-500">{f.itens} lançamento{f.itens > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-red-400">{formatCurrency(f.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer total */}
        {faturas.length > 0 && (
          <div className="px-4 py-3 border-t border-[var(--color-dark-border)] flex justify-between items-center flex-shrink-0 bg-[var(--color-dark-surface)]">
            <p className="text-sm font-semibold text-slate-300">Total Previsto</p>
            <p className="text-base font-bold text-red-400">{formatCurrency(totalGeral)}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
