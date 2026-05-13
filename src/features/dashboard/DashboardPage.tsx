import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  PiggyBank,
  BarChart3,
  FileDown,
} from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { generateActivityReport } from '@/lib/pdf-report';
import { useAuthStore } from '@/stores/auth-store';
import DashboardCharts from './DashboardCharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const contasAll = useLiveQuery(() => db.contas.toArray()) || [];
  const lancamentos = useLiveQuery(() => db.lancamentos.toArray()) || [];

  const contas = contasAll.filter((c) => c.ativo && !c.deleted_at);

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];

  const saldoAtual = contas.reduce((sum, c) => sum + (c.saldo_atual || 0), 0);

  const lancamentosMes = lancamentos.filter(
    (l) => l.data_competencia?.startsWith(mesAtual) && !l.deleted_at
  );

  const receitasMes = lancamentosMes
    .filter((l) => l.tipo === 'receita' && l.status === 'pago')
    .reduce((sum, l) => sum + l.valor, 0);

  const despesasMes = lancamentosMes
    .filter((l) => l.tipo === 'despesa' && l.status === 'pago')
    .reduce((sum, l) => sum + l.valor, 0);

  const resultadoMes = receitasMes - despesasMes;

  const receitasPrevistas = lancamentosMes
    .filter((l) => l.tipo === 'receita')
    .reduce((sum, l) => sum + l.valor, 0);

  const despesasPrevistas = lancamentosMes
    .filter((l) => l.tipo === 'despesa')
    .reduce((sum, l) => sum + l.valor, 0);

  const saldoPrevisto = saldoAtual + (receitasPrevistas - receitasMes) - (despesasPrevistas - despesasMes);

  const contasVencidas = lancamentos.filter(
    (l) => l.status === 'pendente' && l.data_vencimento < today && !l.deleted_at
  ).length;

  const contasAVencer = lancamentos.filter(
    (l) => l.status === 'pendente' && l.data_vencimento >= today && !l.deleted_at
  ).length;

  const economiaMes = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0;

  const kpis = [
    {
      label: 'Saldo Atual',
      value: formatCurrency(saldoAtual),
      icon: Wallet,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'hover:border-blue-500/30',
      trend: saldoAtual >= 0 ? 'up' : 'down',
    },
    {
      label: 'Saldo Previsto',
      value: formatCurrency(saldoPrevisto),
      icon: BarChart3,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      glow: 'hover:border-violet-500/30',
      trend: saldoPrevisto >= saldoAtual ? 'up' : 'down',
    },
    {
      label: 'Receitas Mês',
      value: formatCurrency(receitasMes),
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'hover:border-emerald-500/30',
      trend: 'up' as const,
    },
    {
      label: 'Despesas Mês',
      value: formatCurrency(despesasMes),
      icon: TrendingDown,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      glow: 'hover:border-red-500/30',
      trend: 'down' as const,
    },
    {
      label: 'Resultado',
      value: formatCurrency(resultadoMes),
      icon: resultadoMes >= 0 ? ArrowUpRight : ArrowDownRight,
      color: resultadoMes >= 0 ? 'text-emerald-400' : 'text-red-400',
      bg: resultadoMes >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      border: resultadoMes >= 0 ? 'border-emerald-500/20' : 'border-red-500/20',
      glow: resultadoMes >= 0 ? 'hover:border-emerald-500/30' : 'hover:border-red-500/30',
      trend: resultadoMes >= 0 ? 'up' : 'down',
    },
    {
      label: 'Vencidas',
      value: String(contasVencidas),
      icon: AlertTriangle,
      color: contasVencidas > 0 ? 'text-red-400' : 'text-emerald-400',
      bg: contasVencidas > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
      border: contasVencidas > 0 ? 'border-red-500/20' : 'border-emerald-500/20',
      glow: contasVencidas > 0 ? 'hover:border-red-500/30' : 'hover:border-emerald-500/30',
      trend: contasVencidas > 0 ? 'down' : 'up',
    },
    {
      label: 'A Vencer',
      value: String(contasAVencer),
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'hover:border-amber-500/30',
      trend: 'neutral' as const,
    },
    {
      label: 'Economia',
      value: `${economiaMes.toFixed(1)}%`,
      icon: PiggyBank,
      color: economiaMes >= 0 ? 'text-emerald-400' : 'text-red-400',
      bg: economiaMes >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      border: economiaMes >= 0 ? 'border-emerald-500/20' : 'border-red-500/20',
      glow: economiaMes >= 0 ? 'hover:border-emerald-500/30' : 'hover:border-red-500/30',
      trend: economiaMes >= 0 ? 'up' : 'down',
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 w-full">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Visão geral das suas finanças</p>
        </div>
        <button
          onClick={() => {
            generateActivityReport({
              title: 'Relatório de Atividades',
              userName: profile?.nome || 'Usuário',
              periodo: mesAtual,
              lancamentos: lancamentosMes.map(l => ({
                descricao: l.descricao,
                tipo: l.tipo,
                valor: l.valor,
                data_competencia: l.data_competencia,
                status: l.status,
              })),
              resumo: {
                totalReceitas: receitasMes,
                totalDespesas: despesasMes,
                saldo: resultadoMes,
              },
            });
          }}
          className="btn-primary text-xs py-2 px-3"
        >
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
      </motion.div>

      {/* KPI Grid — 2 colunas mobile, 4 tablet/desktop */}
      <div className="kpi-grid grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              variants={itemVariants}
              className={`card p-3 md:p-4 border ${kpi.border} ${kpi.glow} cursor-default`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${kpi.color}`} />
                </div>
                <span className="flex-shrink-0">
                  {kpi.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-400 opacity-70" />}
                  {kpi.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-400 opacity-70" />}
                </span>
              </div>
              <p className="kpi-label text-[10px] md:text-xs text-slate-500 mb-0.5 leading-tight truncate">{kpi.label}</p>
              <p className={`kpi-value text-sm md:text-base lg:text-lg font-bold ${kpi.color} leading-tight`}>
                {kpi.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <DashboardCharts lancamentos={lancamentos} />
    </motion.div>
  );
}
