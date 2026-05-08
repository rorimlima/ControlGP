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
} from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import DashboardCharts from './DashboardCharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const contas = useLiveQuery(() => db.contas.where('ativo').equals(1).toArray()) || [];
  const lancamentos = useLiveQuery(() => db.lancamentos.toArray()) || [];

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Cálculos
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

  const saldoPrevisto = saldoAtual + receitasPrevistas - receitasMes - (despesasPrevistas - despesasMes);

  const contasVencidas = lancamentos.filter(
    (l) => l.status === 'pendente' && l.data_vencimento < now.toISOString().split('T')[0] && !l.deleted_at
  ).length;

  const contasAVencer = lancamentos.filter(
    (l) => l.status === 'pendente' && l.data_vencimento >= now.toISOString().split('T')[0] && !l.deleted_at
  ).length;

  const economiaMes = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0;

  const kpis = [
    {
      label: 'Saldo Atual',
      value: formatCurrency(saldoAtual),
      icon: Wallet,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      trend: saldoAtual >= 0 ? 'up' : 'down',
    },
    {
      label: 'Saldo Previsto',
      value: formatCurrency(saldoPrevisto),
      icon: BarChart3,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      trend: saldoPrevisto >= saldoAtual ? 'up' : 'down',
    },
    {
      label: 'Receitas do Mês',
      value: formatCurrency(receitasMes),
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      trend: 'up' as const,
    },
    {
      label: 'Despesas do Mês',
      value: formatCurrency(despesasMes),
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      trend: 'down' as const,
    },
    {
      label: 'Resultado Mensal',
      value: formatCurrency(resultadoMes),
      icon: resultadoMes >= 0 ? ArrowUpRight : ArrowDownRight,
      color: resultadoMes >= 0 ? 'text-emerald-400' : 'text-red-400',
      bgColor: resultadoMes >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      borderColor: resultadoMes >= 0 ? 'border-emerald-500/20' : 'border-red-500/20',
      trend: resultadoMes >= 0 ? 'up' : 'down',
    },
    {
      label: 'Contas Vencidas',
      value: String(contasVencidas),
      icon: AlertTriangle,
      color: contasVencidas > 0 ? 'text-red-400' : 'text-emerald-400',
      bgColor: contasVencidas > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
      borderColor: contasVencidas > 0 ? 'border-red-500/20' : 'border-emerald-500/20',
      trend: contasVencidas > 0 ? 'down' : 'up',
    },
    {
      label: 'Contas a Vencer',
      value: String(contasAVencer),
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      trend: 'neutral' as const,
    },
    {
      label: 'Economia Mensal',
      value: `${economiaMes.toFixed(1)}%`,
      icon: PiggyBank,
      color: economiaMes >= 0 ? 'text-emerald-400' : 'text-red-400',
      bgColor: economiaMes >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      borderColor: economiaMes >= 0 ? 'border-emerald-500/20' : 'border-red-500/20',
      trend: economiaMes >= 0 ? 'up' : 'down',
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Visão geral das suas finanças</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              variants={itemVariants}
              className={`card p-4 md:p-5 border ${kpi.borderColor} hover:shadow-lg transition-all group`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${kpi.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                </div>
                {kpi.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                {kpi.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-400" />}
              </div>
              <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
              <p className={`text-lg md:text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <DashboardCharts lancamentos={lancamentos} />
    </motion.div>
  );
}
