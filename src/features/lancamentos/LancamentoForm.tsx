import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowDownRight, ArrowUpRight, Plus, CreditCard, Layers } from 'lucide-react';
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

// ──────────────────────────────────────────────────────────
// FINANCE HELPER: Calculate invoice due dates for a card
// ──────────────────────────────────────────────────────────

/**
 * Given a purchase date and a credit card's closing/due days,
 * returns the due date (dia_vencimento) of the Nth invoice
 * starting from the first applicable billing cycle.
 *
 * Logic:
 *  - If the purchase happens BEFORE the card's closing day in
 *    the current month, it falls into the current cycle and the
 *    first invoice due date is dia_vencimento of the SAME month
 *    (or next month if vencimento < fechamento).
 *  - If the purchase happens ON or AFTER the closing day, it
 *    rolls into the NEXT billing cycle.
 *  - Subsequent parcels increment the month by 1 each time.
 */
function calcInvoiceDueDate(
  purchaseDate: string,
  diaFechamento: number,
  diaVencimento: number,
  parcelaIndex: number, // 0-based (0 = first installment)
): string {
  const d = new Date(purchaseDate + 'T12:00:00');
  const purchaseDay = d.getDate();
  let year = d.getFullYear();
  let month = d.getMonth(); // 0-based

  // Determine the first billing cycle
  if (purchaseDay >= diaFechamento) {
    // Purchase is on/after closing → rolls to next cycle
    month += 1;
  }

  // The invoice due date is in the month AFTER the closing month
  // when vencimento day comes after fechamento day, it's same month;
  // otherwise it's the next month (e.g., fecha 25, vence 5 → next month)
  if (diaVencimento <= diaFechamento) {
    month += 1;
  }

  // Add parcela offset
  month += parcelaIndex;

  // Normalize overflow
  year += Math.floor(month / 12);
  month = month % 12;

  // Clamp day to last day of target month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(diaVencimento, lastDay);

  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export default function LancamentoForm({ editData, onClose, categorias, contas, cartoes, pessoas, userId, tenantId, onFeedback }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: editData?.tipo || 'despesa' as 'receita' | 'despesa',
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

  // Installment state
  const [parcelado, setParcelado] = useState(editData?.parcelado || false);
  const [qtdParcelas, setQtdParcelas] = useState(editData?.quantidade_parcelas || 2);

  const isReceita = form.tipo === 'receita';
  const isCartaoCredito = !isReceita && form.forma_pagamento === 'cartao_credito';
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Filter pessoas by transaction type
  const pessoasFiltradas = pessoas.filter(p => {
    if (!p.ativo || p.deleted_at) return false;
    if (isReceita) return p.tipo === 'recebedor' || p.tipo === 'ambos';
    return p.tipo === 'pagador' || p.tipo === 'ambos';
  });

  // Filter categorias by type
  const categoriasFiltradas = categorias.filter(c => c.tipo === form.tipo && c.ativo && !c.deleted_at);
  const contasAtivas = contas.filter(c => c.ativo && !c.deleted_at);
  const cartoesAtivos = cartoes.filter(c => c.ativo && !c.deleted_at);

  // Selected card info
  const selectedCard = cartoesAtivos.find(c => c.id === form.cartao_id);

  // Calculate installment preview
  const valorTotal = parseFloat(form.valor) || 0;
  const valorParcela = parcelado && qtdParcelas > 0 ? valorTotal / qtdParcelas : valorTotal;

  // Generate preview dates
  const parcelasPreview = (() => {
    if (!parcelado || !selectedCard || valorTotal <= 0) return [];
    return Array.from({ length: qtdParcelas }, (_, i) => {
      const dueDate = calcInvoiceDueDate(
        form.data_competencia,
        selectedCard.dia_fechamento,
        selectedCard.dia_vencimento,
        i,
      );
      return {
        parcela: i + 1,
        valor: valorParcela,
        vencimento: dueDate,
      };
    });
  })();

  const handleSave = async () => {
    if (!form.descricao.trim()) return onFeedback('error', 'Descrição é obrigatória');
    if (!form.valor || parseFloat(form.valor) <= 0) return onFeedback('error', 'Valor deve ser maior que zero');

    setSaving(true);
    const now = new Date().toISOString();
    const valor = parseFloat(form.valor);

    // ── PARCELADO: Insert N installments ──
    if (isCartaoCredito && parcelado && qtdParcelas >= 2 && selectedCard) {
      const paiId = generateId(); // ID to link all installments
      let errorOccurred = false;

      for (let i = 0; i < qtdParcelas; i++) {
        const venc = calcInvoiceDueDate(
          form.data_competencia,
          selectedCard.dia_fechamento,
          selectedCard.dia_vencimento,
          i,
        );

        const payload = {
          tipo: form.tipo,
          descricao: `${form.descricao} (${i + 1}/${qtdParcelas})`,
          valor: Math.round(valorParcela * 100) / 100, // avoid floating point
          data_competencia: form.data_competencia,
          data_vencimento: venc,
          data_pagamento: null,
          status: 'pendente' as const,
          pessoa_id: form.pessoa_id || null,
          categoria_id: form.categoria_id || null,
          conta_id: form.conta_id || null,
          cartao_id: form.cartao_id,
          forma_pagamento: 'cartao_credito',
          parcelado: true,
          quantidade_parcelas: qtdParcelas,
          parcela_atual: i + 1,
          lancamento_pai_id: paiId,
          recorrente: false,
          tags: [],
          observacoes: form.observacoes || null,
        };

        const { error } = await crudInsert('lancamentos', payload, userId, tenantId);
        if (error) {
          onFeedback('error', `Erro na parcela ${i + 1}: ${error}`);
          errorOccurred = true;
          break;
        }
      }

      if (!errorOccurred) {
        onFeedback('success', `${qtdParcelas}x parcelas de ${formatCurrency(valorParcela)} criadas`);
      }
    } else {
      // ── SINGLE RECORD (original behavior) ──
      const payload = {
        tipo: form.tipo,
        descricao: form.descricao,
        valor,
        data_competencia: form.data_competencia,
        data_vencimento: form.data_vencimento,
        data_pagamento: form.status === 'pago' ? now.split('T')[0] : null,
        status: form.status,
        pessoa_id: form.pessoa_id || null,
        categoria_id: form.categoria_id || null,
        conta_id: form.conta_id || null,
        cartao_id: (!isReceita && form.forma_pagamento === 'cartao_credito') ? (form.cartao_id || null) : null,
        forma_pagamento: isReceita ? null : form.forma_pagamento,
        parcelado: false,
        recorrente: false,
        tags: [],
        observacoes: form.observacoes || null,
      };

      if (editData) {
        const { error } = await crudUpdate('lancamentos', editData.id, payload);
        if (error) onFeedback('error', error);
        else onFeedback('success', 'Lançamento atualizado');
      } else {
        const { error } = await crudInsert('lancamentos', payload, userId, tenantId);
        if (error) onFeedback('error', error);
        else onFeedback('success', isReceita ? 'Recebimento registrado' : 'Pagamento registrado');
      }
    }

    setSaving(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-2xl">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">{editData ? 'Editar' : 'Novo'} Lançamento</h2>

          {/* ==== TIPO: A RECEBER / A PAGAR ==== */}
          <div className="flex gap-2">
            <button onClick={() => { set('tipo', 'receita'); set('forma_pagamento', ''); set('cartao_id', ''); setParcelado(false); }} className={cn('flex-1 py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2', form.tipo === 'receita' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-[var(--color-dark-border)]')}>
              <ArrowUpRight className="w-4 h-4" /> A Receber
            </button>
            <button onClick={() => { set('tipo', 'despesa'); set('forma_pagamento', 'pix'); }} className={cn('flex-1 py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2', form.tipo === 'despesa' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'text-slate-400 border-[var(--color-dark-border)]')}>
              <ArrowDownRight className="w-4 h-4" /> A Pagar
            </button>
          </div>

          {/* ==== DESCRIÇÃO ==== */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Descrição *</label>
            <input value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder={isReceita ? 'Ex: Salário, Freelance...' : 'Ex: Aluguel, Conta de luz...'} className="input-field" />
          </div>

          {/* ==== VALOR ==== */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Valor *</label>
            <input type="number" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" className="input-field text-lg font-bold" />
          </div>

          {/* ==== PESSOA ==== */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {isReceita ? 'Receber de' : 'Pagar para'}
            </label>
            <select value={form.pessoa_id} onChange={e => set('pessoa_id', e.target.value)} className="input-field">
              <option value="">Selecionar pessoa...</option>
              {pessoasFiltradas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          {/* ==== DATAS ==== */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Competência</label>
              <input type="date" value={form.data_competencia} onChange={e => set('data_competencia', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Vencimento</label>
              <input type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} className="input-field" disabled={isCartaoCredito && parcelado} />
            </div>
          </div>

          {/* ==== CATEGORIA ==== */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoria</label>
            <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)} className="input-field">
              <option value="">Selecionar</option>
              {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* ==== CONTA (para A Receber: onde o valor entra / para A Pagar: de onde sai) ==== */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {isReceita ? 'Entra na conta' : 'Sai da conta'}
            </label>
            <select value={form.conta_id} onChange={e => set('conta_id', e.target.value)} className="input-field">
              <option value="">Selecionar conta</option>
              {contasAtivas.map(c => <option key={c.id} value={c.id}>{c.nome} {c.banco ? `(${c.banco})` : ''}</option>)}
            </select>
          </div>

          {/* ==== FORMA DE PAGAMENTO (só para A Pagar) ==== */}
          {!isReceita && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'pix', label: 'PIX' },
                  { value: 'dinheiro', label: 'Dinheiro' },
                  { value: 'boleto', label: 'Boleto' },
                  { value: 'cartao_credito', label: 'Cartão Crédito' },
                  { value: 'cartao_debito', label: 'Cartão Débito' },
                  { value: 'transferencia', label: 'Transferência' },
                ] as const).map(fp => (
                  <button key={fp.value} onClick={() => { set('forma_pagamento', fp.value); if (fp.value !== 'cartao_credito') setParcelado(false); }} className={cn('py-2 rounded-xl text-xs font-medium border transition-all', form.forma_pagamento === fp.value ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'text-slate-400 border-[var(--color-dark-border)]')}>
                    {fp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ==== CARTÃO (quando forma = cartao_credito) ==== */}
          {isCartaoCredito && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Cartão de Crédito</label>
              <select value={form.cartao_id} onChange={e => set('cartao_id', e.target.value)} className="input-field">
                <option value="">Selecionar cartão</option>
                {cartoesAtivos.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.bandeira.toUpperCase()})</option>)}
              </select>
            </div>
          )}

          {/* ==== PARCELAMENTO (quando cartão crédito selecionado) ==== */}
          {isCartaoCredito && form.cartao_id && !editData && (
            <div className="space-y-3">
              {/* Toggle */}
              <button
                onClick={() => setParcelado(!parcelado)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                  parcelado
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                    : 'border-[var(--color-dark-border)] text-slate-400 hover:border-slate-600'
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Layers className="w-4 h-4" />
                  Parcelar compra
                </span>
                <span className={cn(
                  'w-10 h-6 rounded-full relative transition-all',
                  parcelado ? 'bg-violet-500' : 'bg-slate-700'
                )}>
                  <span className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                    parcelado ? 'left-5' : 'left-1'
                  )} />
                </span>
              </button>

              {/* Installment options */}
              <AnimatePresence>
                {parcelado && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    {/* Quantity selector */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Número de Parcelas</label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 21, 24].map(n => (
                          <button
                            key={n}
                            onClick={() => setQtdParcelas(n)}
                            className={cn(
                              'py-2 rounded-lg text-xs font-bold border transition-all',
                              qtdParcelas === n
                                ? 'bg-violet-500/20 text-violet-400 border-violet-500/40 shadow-lg shadow-violet-500/10'
                                : 'text-slate-500 border-[var(--color-dark-border)] hover:text-slate-300'
                            )}
                          >
                            {n}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary card */}
                    {valorTotal > 0 && (
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Valor total</span>
                          <span className="text-sm font-bold text-white">{formatCurrency(valorTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Parcelas</span>
                          <span className="text-sm font-bold text-violet-400">
                            {qtdParcelas}x de {formatCurrency(valorParcela)}
                          </span>
                        </div>
                        {selectedCard && (
                          <div className="flex items-center gap-2 mt-1 pt-2 border-t border-violet-500/10">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-500">
                              {selectedCard.nome} · Fecha dia {selectedCard.dia_fechamento} · Vence dia {selectedCard.dia_vencimento}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Due dates preview */}
                    {parcelasPreview.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Previsão das Faturas
                        </label>
                        <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {parcelasPreview.map(p => (
                            <div key={p.parcela} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-dark-hover)] border border-[var(--color-dark-border)]">
                              <span className="text-xs font-medium text-slate-300">
                                Parcela {p.parcela}/{qtdParcelas}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500">
                                  {new Date(p.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-xs font-bold text-violet-400">
                                  {formatCurrency(p.valor)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ==== OBSERVAÇÕES ==== */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} className="input-field resize-none" placeholder="Anotações opcionais..." />
          </div>

          {/* ==== STATUS (hide when installment mode — always pendente) ==== */}
          {!(isCartaoCredito && parcelado) && (
            <div className="flex gap-2">
              {(['pendente', 'pago'] as const).map(s => (
                <button key={s} onClick={() => set('status', s)} className={cn('flex-1 py-2 rounded-xl text-sm font-medium border transition-all', form.status === s ? (s === 'pago' ? 'badge-pago' : 'badge-pendente') : 'text-slate-400 border-[var(--color-dark-border)]')}>
                  {s === 'pago' ? (isReceita ? 'Recebido' : 'Pago') : 'Pendente'}
                </button>
              ))}
            </div>
          )}

          {/* ==== AÇÕES ==== */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)]">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Salvando...' : (isCartaoCredito && parcelado && !editData) ? `Criar ${qtdParcelas}x Parcelas` : editData ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
