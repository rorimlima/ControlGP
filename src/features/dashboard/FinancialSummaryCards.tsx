import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight,
  Calendar, CalendarClock, TrendingUp, TrendingDown, Scale,
} from 'lucide-react';
import type { LocalLancamento } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';

interface Props {
  lancamentos: LocalLancamento[];
}

const fade = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function FinancialSummaryCards({ lancamentos }: Props) {
  const [monthOffset, setMonthOffset] = useState(0);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const mesKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
  const mesLabel = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const lancs = useMemo(() => lancamentos.filter(l => !l.deleted_at), [lancamentos]);

  // POR COMPETÊNCIA
  const byCompetencia = useMemo(() => {
    const filtered = lancs.filter(l => l.data_competencia?.startsWith(mesKey));
    const recTotal = filtered.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despTotal = filtered.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    const recPago = filtered.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
    const despPago = filtered.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
    const recPend = filtered.filter(l => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
    const despPend = filtered.filter(l => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
    return { recTotal, despTotal, recPago, despPago, recPend, despPend, saldo: recTotal - despTotal };
  }, [lancs, mesKey]);

  // POR VENCIMENTO
  const byVencimento = useMemo(() => {
    const filtered = lancs.filter(l => l.data_vencimento?.startsWith(mesKey));
    const recTotal = filtered.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despTotal = filtered.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    const recPago = filtered.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
    const despPago = filtered.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
    const recPend = filtered.filter(l => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
    const despPend = filtered.filter(l => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
    return { recTotal, despTotal, recPago, despPago, recPend, despPend, saldo: recTotal - despTotal };
  }, [lancs, mesKey]);

  const pct = (val: number, total: number) => total > 0 ? Math.min(100, Math.round((val / total) * 100)) : 0;

  return (
    <motion.div variants={fade} className="space-y-4">
      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-dark-text)' }}>
            Resumo Financeiro
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonthOffset(p => p - 1)} className="p-1.5 rounded-lg hover:bg-[var(--color-dark-hover)] text-slate-400 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setMonthOffset(0)} className="px-3 py-1 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-500/10 transition-all capitalize">
            {mesLabel}
          </button>
          <button onClick={() => setMonthOffset(p => p + 1)} className="p-1.5 rounded-lg hover:bg-[var(--color-dark-hover)] text-slate-400 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* POR COMPETÊNCIA */}
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-dark-card)', borderColor: 'var(--color-dark-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-dark-text)' }}>Por Competência</span>
              <p className="text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>Quando o fato gerador ocorreu</p>
            </div>
          </div>

          {/* Receitas */}
          <div className="rounded-lg p-3" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">Receitas</span>
              </div>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(byCompetencia.recTotal)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--color-dark-border)' }}>
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct(byCompetencia.recPago, byCompetencia.recTotal)}%` }} />
            </div>
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>
              <span>Recebido: {formatCurrency(byCompetencia.recPago)}</span>
              <span>Pendente: {formatCurrency(byCompetencia.recPend)}</span>
            </div>
          </div>

          {/* Despesas */}
          <div className="rounded-lg p-3" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-rose-400">Despesas</span>
              </div>
              <span className="text-sm font-bold text-rose-400">{formatCurrency(byCompetencia.despTotal)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--color-dark-border)' }}>
              <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${pct(byCompetencia.despPago, byCompetencia.despTotal)}%` }} />
            </div>
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>
              <span>Pago: {formatCurrency(byCompetencia.despPago)}</span>
              <span>Pendente: {formatCurrency(byCompetencia.despPend)}</span>
            </div>
          </div>

          {/* Saldo */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-dark-border)' }}>
            <div className="flex items-center gap-1.5">
              {byCompetencia.saldo >= 0
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              <span className="text-xs font-medium" style={{ color: 'var(--color-dark-muted)' }}>Resultado</span>
            </div>
            <span className={`text-sm font-bold ${byCompetencia.saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {byCompetencia.saldo >= 0 ? '+' : ''}{formatCurrency(byCompetencia.saldo)}
            </span>
          </div>
        </div>

        {/* POR VENCIMENTO */}
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-dark-card)', borderColor: 'var(--color-dark-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <CalendarClock className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-dark-text)' }}>Por Vencimento</span>
              <p className="text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>Quando o pagamento é devido</p>
            </div>
          </div>

          {/* Receitas */}
          <div className="rounded-lg p-3" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">A Receber</span>
              </div>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(byVencimento.recTotal)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--color-dark-border)' }}>
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct(byVencimento.recPago, byVencimento.recTotal)}%` }} />
            </div>
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>
              <span>Recebido: {formatCurrency(byVencimento.recPago)}</span>
              <span>Pendente: {formatCurrency(byVencimento.recPend)}</span>
            </div>
          </div>

          {/* Despesas */}
          <div className="rounded-lg p-3" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-rose-400">A Pagar</span>
              </div>
              <span className="text-sm font-bold text-rose-400">{formatCurrency(byVencimento.despTotal)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--color-dark-border)' }}>
              <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${pct(byVencimento.despPago, byVencimento.despTotal)}%` }} />
            </div>
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>
              <span>Pago: {formatCurrency(byVencimento.despPago)}</span>
              <span>Pendente: {formatCurrency(byVencimento.despPend)}</span>
            </div>
          </div>

          {/* Saldo */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-dark-border)' }}>
            <div className="flex items-center gap-1.5">
              {byVencimento.saldo >= 0
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              <span className="text-xs font-medium" style={{ color: 'var(--color-dark-muted)' }}>Fluxo de Caixa</span>
            </div>
            <span className={`text-sm font-bold ${byVencimento.saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {byVencimento.saldo >= 0 ? '+' : ''}{formatCurrency(byVencimento.saldo)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
