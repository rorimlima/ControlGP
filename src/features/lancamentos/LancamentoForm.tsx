import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowDownRight, ArrowUpRight, CreditCard, Layers, ChevronDown, X } from 'lucide-react';
import { type LocalLancamento, type LocalCategoria, type LocalConta, type LocalCartao, type LocalPessoa } from '@/lib/database';
import { crudInsert, crudUpdate } from '@/lib/crud-engine';
import { cn, formatCurrency, generateId } from '@/lib/utils';

interface Props {
  editData: LocalLancamento | null;
  onClose: () => void;
  categorias: LocalCategoria[];
  contas: LocalConta[];
  cartoes: LocalCartao[];
  pessoas: LocalPessoa[];
  userId: string;
  tenantId: string;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
}

function calcInvoiceDueDate(purchaseDate: string, diaFechamento: number, diaVencimento: number, idx: number): string {
  const d = new Date(purchaseDate + 'T12:00:00');
  let year = d.getFullYear();
  let month = d.getMonth();
  if (d.getDate() >= diaFechamento) month += 1;
  if (diaVencimento <= diaFechamento) month += 1;
  month += idx;
  year += Math.floor(month / 12);
  month = month % 12;
  const day = Math.min(diaVencimento, new Date(year, month + 1, 0).getDate());
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calcBoletoDueDate(baseDate: string, idx: number): string {
  const d = new Date(baseDate + 'T12:00:00');
  let month = d.getMonth() + idx;
  const year = d.getFullYear() + Math.floor(month / 12);
  month = month % 12;
  const day = Math.min(d.getDate(), new Date(year, month + 1, 0).getDate());
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const FORMAS = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao_credito', label: 'Crédito' },
  { value: 'cartao_debito', label: 'Débito' },
  { value: 'transferencia', label: 'TED/DOC' },
] as const;

const QTD_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 21, 24];

export default function LancamentoForm({ editData, onClose, categorias, contas, cartoes, pessoas, userId, tenantId, onFeedback }: Props) {
  const [saving, setSaving] = useState(false);
  const [showParcelas, setShowParcelas] = useState(false);
  const [parcelado, setParcelado] = useState(editData?.parcelado || false);
  const [qtdParcelas, setQtdParcelas] = useState(editData?.quantidade_parcelas || 2);

  const [form, setForm] = useState({
    tipo: (editData?.tipo || 'despesa') as 'receita' | 'despesa',
    descricao: editData?.descricao || '',
    valor: editData ? String(editData.valor) : '',
    data_competencia: editData?.data_competencia || new Date().toISOString().split('T')[0],
    data_vencimento: editData?.data_vencimento || new Date().toISOString().split('T')[0],
    status: (editData?.status || 'pendente') as 'pendente' | 'pago',
    pessoa_id: editData?.pessoa_id || '',
    categoria_id: editData?.categoria_id || '',
    conta_id: editData?.conta_id || '',
    cartao_id: editData?.cartao_id || '',
    forma_pagamento: editData?.forma_pagamento || 'pix',
    observacoes: editData?.observacoes || '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const isReceita = form.tipo === 'receita';
  const isCartao = !isReceita && form.forma_pagamento === 'cartao_credito';
  const isBoleto = !isReceita && form.forma_pagamento === 'boleto';
  const canParcelar = (isCartao && !!form.cartao_id) || isBoleto;
  const selectedCard = cartoes.find(c => c.id === form.cartao_id && c.ativo && !c.deleted_at);

  const valorTotal = parseFloat(form.valor) || 0;
  const valorParcela = parcelado && qtdParcelas > 0 ? valorTotal / qtdParcelas : valorTotal;

  const parcelasPreview = (() => {
    if (!parcelado || valorTotal <= 0) return [];
    if (isCartao && selectedCard) {
      return Array.from({ length: qtdParcelas }, (_, i) => ({
        n: i + 1,
        valor: valorParcela,
        venc: calcInvoiceDueDate(form.data_competencia, selectedCard.dia_fechamento, selectedCard.dia_vencimento, i),
      }));
    }
    if (isBoleto) {
      return Array.from({ length: qtdParcelas }, (_, i) => ({
        n: i + 1,
        valor: valorParcela,
        venc: calcBoletoDueDate(form.data_vencimento, i),
      }));
    }
    return [];
  })();

  const handleChangeTipo = (tipo: 'receita' | 'despesa') => {
    setForm(p => ({ ...p, tipo, forma_pagamento: tipo === 'receita' ? '' : 'pix', cartao_id: '' }));
    setParcelado(false);
    setShowParcelas(false);
  };

  const handleChangeForma = (v: string) => {
    set('forma_pagamento', v);
    if (v !== 'cartao_credito' && v !== 'boleto') { setParcelado(false); setShowParcelas(false); }
    if (v !== 'cartao_credito') set('cartao_id', '');
  };

  const handleSave = async () => {
    if (!form.descricao.trim()) return onFeedback('error', 'Descrição é obrigatória');
    if (!form.valor || parseFloat(form.valor) <= 0) return onFeedback('error', 'Valor deve ser maior que zero');
    setSaving(true);
    const now = new Date().toISOString();
    const valor = parseFloat(form.valor);

    const isParcelando = parcelado && qtdParcelas >= 2 && !editData && canParcelar;

    if (isParcelando) {
      const paiId = generateId();
      let err = false;
      for (let i = 0; i < qtdParcelas; i++) {
        const venc = isCartao && selectedCard
          ? calcInvoiceDueDate(form.data_competencia, selectedCard.dia_fechamento, selectedCard.dia_vencimento, i)
          : calcBoletoDueDate(form.data_vencimento, i);
        const { error } = await crudInsert('lancamentos', {
          tipo: form.tipo, descricao: `${form.descricao} (${i + 1}/${qtdParcelas})`,
          valor: Math.round(valorParcela * 100) / 100,
          data_competencia: form.data_competencia, data_vencimento: venc,
          data_pagamento: null, status: 'pendente',
          pessoa_id: form.pessoa_id || null, categoria_id: form.categoria_id || null,
          conta_id: form.conta_id || null,
          cartao_id: isCartao ? form.cartao_id : null,
          forma_pagamento: isCartao ? 'cartao_credito' : 'boleto',
          parcelado: true, quantidade_parcelas: qtdParcelas, parcela_atual: i + 1,
          lancamento_pai_id: paiId, recorrente: false, tags: [],
          observacoes: form.observacoes || null,
        }, userId, tenantId);
        if (error) { onFeedback('error', `Erro na parcela ${i + 1}: ${error}`); err = true; break; }
      }
      if (!err) onFeedback('success', `${qtdParcelas}x de ${formatCurrency(valorParcela)} criadas`);
    } else {
      const payload = {
        tipo: form.tipo, descricao: form.descricao, valor,
        data_competencia: form.data_competencia, data_vencimento: form.data_vencimento,
        data_pagamento: form.status === 'pago' ? now.split('T')[0] : null,
        status: form.status,
        pessoa_id: form.pessoa_id || null, categoria_id: form.categoria_id || null,
        conta_id: form.conta_id || null,
        cartao_id: isCartao ? (form.cartao_id || null) : null,
        forma_pagamento: isReceita ? null : form.forma_pagamento,
        parcelado: false, recorrente: false, tags: [],
        observacoes: form.observacoes || null,
      };
      if (editData) {
        const { error } = await crudUpdate('lancamentos', editData.id, payload);
        if (error) onFeedback('error', error); else onFeedback('success', 'Lançamento atualizado');
      } else {
        const { error } = await crudInsert('lancamentos', payload, userId, tenantId);
        if (error) onFeedback('error', error);
        else onFeedback('success', isReceita ? 'Recebimento registrado' : 'Pagamento registrado');
      }
    }
    setSaving(false);
    onClose();
  };

  // Color theme based on tipo
  const accent = isReceita ? 'emerald' : 'rose';
  const accentClass = isReceita ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg rounded-t-3xl md:rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-dark-card)', border: '1px solid var(--color-dark-border)', maxHeight: '92dvh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-dark-text)' }}>
            {editData ? 'Editar' : 'Novo'} Lançamento
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto px-5 pb-5 space-y-3" style={{ maxHeight: 'calc(92dvh - 130px)' }}>

          {/* TIPO */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleChangeTipo('receita')}
              className={cn('py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-1.5',
                form.tipo === 'receita' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-[var(--color-dark-border)] hover:border-slate-600')}
            >
              <ArrowUpRight className="w-4 h-4" /> A Receber
            </button>
            <button
              onClick={() => handleChangeTipo('despesa')}
              className={cn('py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-1.5',
                form.tipo === 'despesa' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'text-slate-500 border-[var(--color-dark-border)] hover:border-slate-600')}
            >
              <ArrowDownRight className="w-4 h-4" /> A Pagar
            </button>
          </div>

          {/* DESCRIÇÃO + VALOR (linha compacta) */}
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Descrição *</label>
              <input
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)}
                placeholder={isReceita ? 'Ex: Salário, Freelance...' : 'Ex: Aluguel, Luz...'}
                className="input-field text-sm py-2.5"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Valor *</label>
              <input
                type="number" step="0.01"
                value={form.valor}
                onChange={e => set('valor', e.target.value)}
                placeholder="0,00"
                className={cn('input-field text-sm font-bold py-2.5', isReceita ? 'text-emerald-400' : 'text-rose-400')}
              />
            </div>
          </div>

          {/* DATAS */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Competência</label>
              <input type="date" value={form.data_competencia} onChange={e => set('data_competencia', e.target.value)} className="input-field text-sm py-2.5" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Vencimento {isBoleto && parcelado && <span className="text-amber-400">(1ª parcela)</span>}
              </label>
              <input
                type="date" value={form.data_vencimento}
                onChange={e => set('data_vencimento', e.target.value)}
                className="input-field text-sm py-2.5"
                disabled={isCartao && parcelado}
              />
            </div>
          </div>

          {/* FORMA DE PAGAMENTO (só para despesa) */}
          {!isReceita && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-1.5">
                {FORMAS.map(fp => (
                  <button
                    key={fp.value}
                    onClick={() => handleChangeForma(fp.value)}
                    className={cn(
                      'py-2 rounded-lg text-xs font-medium border transition-all',
                      form.forma_pagamento === fp.value
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'text-slate-500 border-[var(--color-dark-border)] hover:text-slate-300 hover:border-slate-600'
                    )}
                  >
                    {fp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CARTÃO (quando crédito) */}
          {isCartao && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Cartão de Crédito</label>
              <select value={form.cartao_id} onChange={e => set('cartao_id', e.target.value)} className="input-field text-sm py-2.5">
                <option value="">Selecionar cartão</option>
                {cartoes.filter(c => c.ativo && !c.deleted_at).map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.bandeira.toUpperCase()})</option>
                ))}
              </select>
            </div>
          )}

          {/* PARCELAMENTO DROPDOWN */}
          {canParcelar && !editData && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: parcelado ? (isBoleto ? '#d97706' : '#7c3aed') + '50' : 'var(--color-dark-border)' }}>
              {/* Toggle header */}
              <button
                onClick={() => { setShowParcelas(!showParcelas); }}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5 transition-all',
                  parcelado
                    ? (isBoleto ? 'bg-amber-500/10' : 'bg-violet-500/10')
                    : 'hover:bg-[var(--color-dark-hover)]'
                )}
              >
                <div className="flex items-center gap-2">
                  <Layers className={cn('w-3.5 h-3.5', parcelado ? (isBoleto ? 'text-amber-400' : 'text-violet-400') : 'text-slate-500')} />
                  <span className={cn('text-xs font-semibold', parcelado ? (isBoleto ? 'text-amber-400' : 'text-violet-400') : 'text-slate-400')}>
                    {isBoleto ? 'Parcelar em boleto' : 'Parcelar no cartão'}
                  </span>
                  {parcelado && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', isBoleto ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-400')}>
                      {qtdParcelas}x {formatCurrency(valorParcela)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle switch */}
                  <div
                    onClick={e => { e.stopPropagation(); setParcelado(!parcelado); if (!parcelado) setShowParcelas(true); else setShowParcelas(false); }}
                    className={cn('w-9 h-5 rounded-full relative transition-all cursor-pointer', parcelado ? (isBoleto ? 'bg-amber-500' : 'bg-violet-500') : 'bg-slate-700')}
                  >
                    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm', parcelado ? 'left-4' : 'left-0.5')} />
                  </div>
                  <ChevronDown className={cn('w-3.5 h-3.5 text-slate-500 transition-transform', showParcelas ? 'rotate-180' : '')} />
                </div>
              </button>

              {/* Dropdown body */}
              <AnimatePresence>
                {showParcelas && parcelado && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-3.5 pt-2 space-y-3 border-t" style={{ borderColor: 'var(--color-dark-border)' }}>
                      {/* Qtd selector */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Número de parcelas</label>
                        <div className="grid grid-cols-6 gap-1">
                          {QTD_OPTIONS.map(n => (
                            <button
                              key={n}
                              onClick={() => setQtdParcelas(n)}
                              className={cn(
                                'py-1.5 rounded-lg text-xs font-bold border transition-all',
                                qtdParcelas === n
                                  ? (isBoleto ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-violet-500/20 text-violet-400 border-violet-500/40')
                                  : 'text-slate-500 border-[var(--color-dark-border)] hover:text-slate-300'
                              )}
                            >{n}x</button>
                          ))}
                        </div>
                      </div>

                      {/* Resumo + Preview */}
                      {valorTotal > 0 && (
                        <div className={cn('rounded-lg p-3 space-y-2', isBoleto ? 'bg-amber-500/5 border border-amber-500/15' : 'bg-violet-500/5 border border-violet-500/15')}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Total</span>
                            <span className="font-bold text-white">{formatCurrency(valorTotal)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Cada parcela</span>
                            <span className={cn('font-bold', isBoleto ? 'text-amber-400' : 'text-violet-400')}>
                              {qtdParcelas}x {formatCurrency(valorParcela)}
                            </span>
                          </div>
                          {isCartao && selectedCard && (
                            <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'rgba(124,58,237,0.15)' }}>
                              <CreditCard className="w-3 h-3 text-slate-500" />
                              <span className="text-[10px] text-slate-500">
                                {selectedCard.nome} · Fecha {selectedCard.dia_fechamento} · Vence {selectedCard.dia_vencimento}
                              </span>
                            </div>
                          )}
                          {/* Parcelas list */}
                          {parcelasPreview.length > 0 && (
                            <div className="max-h-[120px] overflow-y-auto space-y-1 pt-1 border-t" style={{ borderColor: isBoleto ? 'rgba(217,119,6,0.15)' : 'rgba(124,58,237,0.15)' }}>
                              {parcelasPreview.map(p => (
                                <div key={p.n} className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-500">{p.n}/{qtdParcelas}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(p.venc + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                  <span className={cn('text-[10px] font-bold', isBoleto ? 'text-amber-400' : 'text-violet-400')}>{formatCurrency(p.valor)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* PESSOA */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              {isReceita ? 'Receber de' : 'Pagar para'}
            </label>
            <select value={form.pessoa_id} onChange={e => set('pessoa_id', e.target.value)} className="input-field text-sm py-2.5">
              <option value="">Selecionar pessoa...</option>
              {pessoas.filter(p => p.ativo && !p.deleted_at && (isReceita ? (p.tipo === 'recebedor' || p.tipo === 'ambos') : (p.tipo === 'pagador' || p.tipo === 'ambos'))).map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* CATEGORIA + CONTA (linha) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Categoria</label>
              <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)} className="input-field text-sm py-2.5">
                <option value="">Selecionar</option>
                {categorias.filter(c => c.tipo === form.tipo && c.ativo && !c.deleted_at).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {isReceita ? 'Entra na conta' : 'Sai da conta'}
              </label>
              <select value={form.conta_id} onChange={e => set('conta_id', e.target.value)} className="input-field text-sm py-2.5">
                <option value="">Selecionar</option>
                {contas.filter(c => c.ativo && !c.deleted_at).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              rows={2}
              className="input-field text-sm py-2.5 resize-none"
              placeholder="Anotações opcionais..."
            />
          </div>

          {/* STATUS */}
          {!(canParcelar && parcelado) && (
            <div className="grid grid-cols-2 gap-2">
              {(['pendente', 'pago'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => set('status', s)}
                  className={cn(
                    'py-2.5 rounded-xl text-sm font-semibold border transition-all',
                    form.status === s ? (s === 'pago' ? 'badge-pago' : 'badge-pendente') : 'text-slate-500 border-[var(--color-dark-border)]'
                  )}
                >
                  {s === 'pago' ? (isReceita ? 'Recebido' : 'Pago') : 'Pendente'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--color-dark-border)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 py-2.5 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Salvando...' : (canParcelar && parcelado && !editData) ? `Criar ${qtdParcelas}x Parcelas` : editData ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
