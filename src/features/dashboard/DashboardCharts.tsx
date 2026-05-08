import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { LocalLancamento } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';

interface Props {
  lancamentos: LocalLancamento[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="glass rounded-xl px-4 py-3 shadow-lg border border-[var(--color-dark-border)]">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardCharts({ lancamentos }: Props) {
  // Fluxo de caixa — últimos 6 meses
  const fluxoCaixa = useMemo(() => {
    const now = new Date();
    const months: { month: string; receitas: number; despesas: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });

      const receitas = lancamentos
        .filter((l) => l.data_competencia?.startsWith(key) && l.tipo === 'receita' && l.status === 'pago' && !l.deleted_at)
        .reduce((s, l) => s + l.valor, 0);

      const despesas = lancamentos
        .filter((l) => l.data_competencia?.startsWith(key) && l.tipo === 'despesa' && l.status === 'pago' && !l.deleted_at)
        .reduce((s, l) => s + l.valor, 0);

      months.push({ month: monthName, receitas, despesas });
    }
    return months;
  }, [lancamentos]);

  // Despesas por categoria
  const despesasPorCategoria = useMemo(() => {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const categorias = new Map<string, number>();
    lancamentos
      .filter((l) => l.data_competencia?.startsWith(mesAtual) && l.tipo === 'despesa' && !l.deleted_at)
      .forEach((l) => {
        const cat = l.categoria_id || 'Sem categoria';
        categorias.set(cat, (categorias.get(cat) || 0) + l.valor);
      });

    return Array.from(categorias.entries())
      .map(([name, value]) => ({ name: name.substring(0, 12), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [lancamentos]);

  // Evolução patrimonial
  const evolucaoPatrimonial = useMemo(() => {
    const now = new Date();
    const data: { month: string; patrimonio: number }[] = [];
    let acumulado = 0;

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });

      const receitas = lancamentos
        .filter((l) => l.data_competencia?.startsWith(key) && l.tipo === 'receita' && l.status === 'pago' && !l.deleted_at)
        .reduce((s, l) => s + l.valor, 0);

      const despesas = lancamentos
        .filter((l) => l.data_competencia?.startsWith(key) && l.tipo === 'despesa' && l.status === 'pago' && !l.deleted_at)
        .reduce((s, l) => s + l.valor, 0);

      acumulado += receitas - despesas;
      data.push({ month: monthName, patrimonio: acumulado });
    }
    return data;
  }, [lancamentos]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Receitas x Despesas */}
      <motion.div variants={itemVariants} className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Receitas x Despesas</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fluxoCaixa} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Evolução Patrimonial */}
      <motion.div variants={itemVariants} className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Evolução Patrimonial</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolucaoPatrimonial}>
              <defs>
                <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="patrimonio" name="Patrimônio" stroke="#3b82f6" fill="url(#gradPatrimonio)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Despesas por Categoria */}
      <motion.div variants={itemVariants} className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Despesas por Categoria</h3>
        <div className="h-64">
          {despesasPorCategoria.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={despesasPorCategoria}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {despesasPorCategoria.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Sem dados para exibir
            </div>
          )}
        </div>
      </motion.div>

      {/* Fluxo de Caixa */}
      <motion.div variants={itemVariants} className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Fluxo de Caixa</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fluxoCaixa}>
              <defs>
                <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#10b981" fill="url(#gradReceitas)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" fill="url(#gradDespesas)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
