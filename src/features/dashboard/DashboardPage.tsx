import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, AlertTriangle, Clock,
  CreditCard, ArrowUpCircle, ArrowDownCircle, ChevronRight,
  FileDown, Landmark, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { generateActivityReport } from '@/lib/pdf-report';
import { useAuthStore } from '@/stores/auth-store';
import DashboardCharts from './DashboardCharts';
import FinancialSummaryCards from './FinancialSummaryCards';
import FutureFlowList from './FutureFlowList';

const fade = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };

export default function DashboardPage() {
  const { profile } = useAuthStore();

  const contasAll  = useLiveQuery(() => db.contas.toArray())     || [];
  const cartoesAll = useLiveQuery(() => db.cartoes.toArray())    || [];
  const lancAll    = useLiveQuery(() => db.lancamentos.toArray()) || [];

  const contas  = useMemo(() => contasAll.filter(c => c.ativo && !c.deleted_at),   [contasAll]);
  const cartoes = useMemo(() => cartoesAll.filter(c => c.ativo && !c.deleted_at),  [cartoesAll]);
  const lancs   = useMemo(() => lancAll.filter(l => !l.deleted_at),                [lancAll]);

  const now     = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const today   = now.toISOString().split('T')[0];

  // KPIs
  const saldoTotal     = useMemo(() => contas.reduce((s, c) => s + (c.saldo_atual || 0), 0), [contas]);
  const lancMes        = useMemo(() => lancs.filter(l => l.data_competencia?.startsWith(mesAtual)), [lancs, mesAtual]);
  const receitasMes    = useMemo(() => lancMes.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + l.valor, 0), [lancMes]);
  const despesasMes    = useMemo(() => lancMes.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0), [lancMes]);
  const vencidas       = useMemo(() => lancs.filter(l => l.status === 'pendente' && l.data_vencimento < today).length, [lancs, today]);
  const aVencer        = useMemo(() => lancs.filter(l => l.status === 'pendente' && l.data_vencimento >= today).length, [lancs, today]);

  // Cartões: gasto pendente por cartão
  const cartaoGasto = useMemo(() => {
    const map: Record<string, number> = {};
    lancs.filter(l => l.cartao_id && l.status === 'pendente').forEach(l => {
      map[l.cartao_id!] = (map[l.cartao_id!] || 0) + l.valor;
    });
    return map;
  }, [lancs]);

  // Últimos lançamentos
  const recentLancs = useMemo(() =>
    [...lancs]
      .sort((a, b) => b.data_competencia.localeCompare(a.data_competencia))
      .slice(0, 5),
    [lancs]
  );

  // Despesas pendentes próximas (próximos 7 dias)
  const proxSete = new Date(); proxSete.setDate(proxSete.getDate() + 7);
  const proxSeteStr = proxSete.toISOString().split('T')[0];
  const contasProximas = useMemo(() =>
    lancs
      .filter(l => l.status === 'pendente' && l.tipo === 'despesa' && l.data_vencimento >= today && l.data_vencimento <= proxSeteStr)
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
      .slice(0, 4),
    [lancs, today, proxSeteStr]
  );

  const kpis = [
    { label: 'Saldo Total', value: formatCurrency(saldoTotal), icon: Wallet,        color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10',    border: 'border-blue-200 dark:border-blue-500/20',   trend: saldoTotal >= 0 ? 'up' : 'down' },
    { label: 'Receitas',    value: formatCurrency(receitasMes), icon: TrendingUp,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', trend: 'up' as const },
    { label: 'Despesas',    value: formatCurrency(despesasMes), icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-500/10',    border: 'border-rose-200 dark:border-rose-500/20',   trend: 'down' as const },
    { label: 'Vencidas',    value: String(vencidas),            icon: AlertTriangle, color: vencidas > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400', bg: vencidas > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10', border: vencidas > 0 ? 'border-red-200 dark:border-red-500/20' : 'border-emerald-200 dark:border-emerald-500/20', trend: vencidas > 0 ? 'down' : 'up' },
    { label: 'A Vencer',    value: String(aVencer),             icon: Clock,         color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10',  border: 'border-amber-200 dark:border-amber-500/20', trend: 'neutral' as const },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5 w-full">

      {/* ── Header ─────────────────────────────────── */}
      <motion.div variants={fade} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-dark-text)' }}>
            Olá, {profile?.nome?.split(' ')[0] || 'Usuário'} 👋
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-dark-muted)' }}>
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => {
            const allReceitas = lancs.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
            const allDespesas = lancs.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
            generateActivityReport({
              title: 'Relatório Consolidado de Atividades', userName: profile?.nome || 'Usuário',
              periodo: 'Todos os Períodos',
              lancamentos: lancs.filter(l => !l.deleted_at).map(l => ({ descricao: l.descricao, tipo: l.tipo, valor: l.valor, data_competencia: l.data_competencia, data_vencimento: l.data_vencimento, status: l.status })),
              resumo: { totalReceitas: allReceitas, totalDespesas: allDespesas, saldo: allReceitas - allDespesas },
            });
          }}
          className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
      </motion.div>

      {/* ── KPI Strip ───────────────────────────────── */}
      <motion.div variants={fade} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="kpi-card rounded-xl p-3.5 border transition-all" style={{ background: 'var(--color-dark-card)', borderColor: 'var(--color-dark-border)' }}>
              <div className="flex items-center justify-between mb-2.5">
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${k.color}`} />
                </div>
                {k.trend === 'up'   && <ArrowUpRight   className="w-3.5 h-3.5 text-emerald-500 opacity-60" />}
                {k.trend === 'down' && <ArrowDownRight  className="w-3.5 h-3.5 text-red-500 opacity-60" />}
              </div>
              <p className="text-xs font-semibold mb-1 truncate uppercase tracking-wider" style={{ color: 'var(--color-dark-muted)' }}>{k.label}</p>
              <p className={`text-lg font-extrabold leading-tight ${k.color}`}>{k.value}</p>
            </div>
          );
        })}
      </motion.div>

      {/* ── Financial Summary Cards ────────────────── */}
      <FinancialSummaryCards lancamentos={lancAll} />

      {/* ── Projeção de Fluxo Futuro ───────────────── */}
      <FutureFlowList lancamentos={lancAll} />

      {/* ── Row: Contas + Cartões ──────────────────── */}
      <motion.div variants={fade} className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Contas */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-dark-card)', borderColor: 'var(--color-dark-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Landmark className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-dark-text)' }}>Contas</span>
            </div>
            <Link to="/contas" className="text-[11px] font-medium text-blue-500 hover:text-blue-400 flex items-center gap-0.5 transition-colors">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {contas.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-dark-muted)' }}>Nenhuma conta cadastrada</p>
          ) : (
            <div className="space-y-2">
              {contas.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg transition-all" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.cor + '22', border: `1px solid ${c.cor}44` }}>
                      <Landmark className="w-3.5 h-3.5" style={{ color: c.cor }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-dark-text)' }}>{c.nome}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>{c.banco || c.tipo_conta}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${c.saldo_atual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(c.saldo_atual)}
                  </p>
                </div>
              ))}
              {contas.length > 4 && (
                <p className="text-[11px] text-center pt-1" style={{ color: 'var(--color-dark-muted)' }}>+{contas.length - 4} conta(s)</p>
              )}
            </div>
          )}
        </div>

        {/* Cartões */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-dark-card)', borderColor: 'var(--color-dark-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-dark-text)' }}>Cartões</span>
            </div>
            <Link to="/cartoes" className="text-[11px] font-medium text-blue-500 hover:text-blue-400 flex items-center gap-0.5 transition-colors">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {cartoes.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-dark-muted)' }}>Nenhum cartão cadastrado</p>
          ) : (
            <div className="space-y-2">
              {cartoes.slice(0, 4).map(c => {
                const gasto  = cartaoGasto[c.id] || 0;
                const disp   = Math.max(0, c.limite - gasto);
                const pct    = c.limite > 0 ? Math.min(100, Math.round((gasto / c.limite) * 100)) : 0;
                return (
                  <div key={c.id} className="p-2.5 rounded-lg" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.cor + '30' }}>
                          <CreditCard className="w-3.5 h-3.5" style={{ color: c.cor }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-dark-text)' }}>{c.nome}</p>
                          <p className="text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>{c.banco || c.bandeira}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-rose-500">{formatCurrency(gasto)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>de {formatCurrency(c.limite)}</p>
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-dark-border)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : c.cor }} />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-dark-muted)' }}>
                      {formatCurrency(disp)} disponível · {pct}% usado
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Row: Próximas contas + Lançamentos recentes ── */}
      <motion.div variants={fade} className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Contas a pagar próximas */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-dark-card)', borderColor: 'var(--color-dark-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-dark-text)' }}>Próximas a Vencer</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">7 dias</span>
            </div>
            <Link to="/lancamentos" className="text-[11px] font-medium text-blue-500 hover:text-blue-400 flex items-center gap-0.5 transition-colors">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {contasProximas.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs" style={{ color: 'var(--color-dark-muted)' }}>✅ Nenhuma conta vencendo nos próximos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contasProximas.map(l => {
                const dias = Math.round((new Date(l.data_vencimento + 'T12:00:00').getTime() - now.getTime()) / 86400000);
                return (
                  <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-dark-text)' }}>{l.descricao}</p>
                        <p className="text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>
                          {new Date(l.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')} · {dias === 0 ? 'hoje' : `${dias}d`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-rose-500 flex-shrink-0">{formatCurrency(l.valor)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos lançamentos */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-dark-card)', borderColor: 'var(--color-dark-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-dark-text)' }}>Lançamentos Recentes</span>
            </div>
            <Link to="/lancamentos" className="text-[11px] font-medium text-blue-500 hover:text-blue-400 flex items-center gap-0.5 transition-colors">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recentLancs.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-dark-muted)' }}>Nenhum lançamento ainda</p>
          ) : (
            <div className="space-y-2">
              {recentLancs.map(l => (
                <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${l.tipo === 'receita' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      {l.tipo === 'receita'
                        ? <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" />
                        : <ArrowDownCircle className="w-3.5 h-3.5 text-rose-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-dark-text)' }}>{l.descricao}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-dark-muted)' }}>
                        {new Date(l.data_competencia + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${l.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {l.tipo === 'receita' ? '+' : '-'}{formatCurrency(l.valor)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Charts ───────────────────────────────────── */}
      <motion.div variants={fade}>
        <DashboardCharts lancamentos={lancAll} />
      </motion.div>

    </motion.div>
  );
}
