import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, CalendarDays, Wallet } from 'lucide-react';
import type { LocalLancamento } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';

interface Props {
  lancamentos: LocalLancamento[];
}

const fade = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function FutureFlowList({ lancamentos }: Props) {
  // Generate next 6 months
  const futureMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      label = label.charAt(0).toUpperCase() + label.slice(1);
      months.push({ key, label });
    }
    return months;
  }, []);

  const flowData = useMemo(() => {
    const validLancs = lancamentos.filter(l => !l.deleted_at && l.status !== 'cancelado');
    
    return futureMonths.map(month => {
      // Future flow usually uses data_vencimento as the actual cash flow date
      const monthLancs = validLancs.filter(l => l.data_vencimento?.startsWith(month.key));
      
      const receitas = monthLancs.filter(l => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0);
      const despesas = monthLancs.filter(l => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0);
      const saldo = receitas - despesas;
      
      return { ...month, receitas, despesas, saldo };
    });
  }, [lancamentos, futureMonths]);

  return (
    <motion.div variants={fade} className="rounded-xl border p-5" style={{ background: 'var(--color-dark-card)', borderColor: 'var(--color-dark-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-dark-text)' }}>Projeção de Fluxo Futuro</h2>
          <p className="text-[11px]" style={{ color: 'var(--color-dark-muted)' }}>Previsão de receitas e despesas para os próximos meses</p>
        </div>
      </div>

      <div className="space-y-3">
        {flowData.map((data, i) => (
          <div key={data.key} className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl transition-all" style={{ background: 'var(--color-dark-hover)', border: '1px solid var(--color-dark-border)' }}>
            
            {/* Mês */}
            <div className="mb-2 md:mb-0 md:w-1/4">
              <span className="text-sm font-bold text-indigo-300">
                {i === 0 ? 'Mês Atual' : data.label}
              </span>
            </div>

            {/* Receitas */}
            <div className="flex items-center gap-2 md:w-1/4">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">A Receber</p>
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(data.receitas)}</p>
              </div>
            </div>

            {/* Despesas */}
            <div className="flex items-center gap-2 md:w-1/4 mt-2 md:mt-0">
              <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">A Pagar</p>
                <p className="text-sm font-bold text-rose-400">{formatCurrency(data.despesas)}</p>
              </div>
            </div>

            {/* Saldo */}
            <div className="flex items-center gap-2 md:w-1/4 justify-start md:justify-end mt-3 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0" style={{ borderColor: 'var(--color-dark-border)' }}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${data.saldo >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
                <Wallet className={`w-3.5 h-3.5 ${data.saldo >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
              </div>
              <div className="text-left md:text-right">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Previsto</p>
                <p className={`text-base font-extrabold ${data.saldo >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {data.saldo > 0 ? '+' : ''}{formatCurrency(data.saldo)}
                </p>
              </div>
            </div>

          </div>
        ))}
      </div>
    </motion.div>
  );
}
