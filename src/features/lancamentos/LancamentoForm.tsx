import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';
import { type LocalLancamento, type LocalCategoria, type LocalConta, type LocalCartao, type LocalPessoa } from '@/lib/database';
import { crudInsert, crudUpdate } from '@/lib/crud-engine';
import { cn } from '@/lib/utils';

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

  const isReceita = form.tipo === 'receita';
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

  const handleSave = async () => {
    if (!form.descricao.trim()) return onFeedback('error', 'Descrição é obrigatória');
    if (!form.valor || parseFloat(form.valor) <= 0) return onFeedback('error', 'Valor deve ser maior que zero');

    setSaving(true);
    const now = new Date().toISOString();
    const valor = parseFloat(form.valor);

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
            <button onClick={() => { set('tipo', 'receita'); set('forma_pagamento', ''); set('cartao_id', ''); }} className={cn('flex-1 py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2', form.tipo === 'receita' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-[var(--color-dark-border)]')}>
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
              <input type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} className="input-field" />
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
                  <button key={fp.value} onClick={() => set('forma_pagamento', fp.value)} className={cn('py-2 rounded-xl text-xs font-medium border transition-all', form.forma_pagamento === fp.value ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'text-slate-400 border-[var(--color-dark-border)]')}>
                    {fp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ==== CARTÃO (quando forma = cartao_credito) ==== */}
          {!isReceita && form.forma_pagamento === 'cartao_credito' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Cartão de Crédito</label>
              <select value={form.cartao_id} onChange={e => set('cartao_id', e.target.value)} className="input-field">
                <option value="">Selecionar cartão</option>
                {cartoesAtivos.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.bandeira.toUpperCase()})</option>)}
              </select>
            </div>
          )}

          {/* ==== OBSERVAÇÕES ==== */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} className="input-field resize-none" placeholder="Anotações opcionais..." />
          </div>

          {/* ==== STATUS ==== */}
          <div className="flex gap-2">
            {(['pendente', 'pago'] as const).map(s => (
              <button key={s} onClick={() => set('status', s)} className={cn('flex-1 py-2 rounded-xl text-sm font-medium border transition-all', form.status === s ? (s === 'pago' ? 'badge-pago' : 'badge-pendente') : 'text-slate-400 border-[var(--color-dark-border)]')}>
                {s === 'pago' ? (isReceita ? 'Recebido' : 'Pago') : 'Pendente'}
              </button>
            ))}
          </div>

          {/* ==== AÇÕES ==== */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-slate-400 border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-hover)]">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Salvando...' : editData ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
