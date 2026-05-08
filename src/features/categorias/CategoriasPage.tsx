import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Tags } from 'lucide-react';
import { db } from '@/lib/database';
import { cn } from '@/lib/utils';

export default function CategoriasPage() {
  const raw = useLiveQuery(() => db.categorias.toArray()) || [];
  const categorias = raw.filter(c => !c.deleted_at && c.ativo);
  const receitas = categorias.filter(c => c.tipo === 'receita').sort((a, b) => a.ordem - b.ordem);
  const despesas = categorias.filter(c => c.tipo === 'despesa').sort((a, b) => a.ordem - b.ordem);

  const renderGroup = (title: string, items: typeof categorias, color: string) => (
    <div>
      <h2 className={cn('text-sm font-semibold mb-3', color)}>{title} ({items.length})</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.cor}20` }}>
              <Tags className="w-4 h-4" style={{ color: c.cor }} />
            </div>
            <span className="text-sm font-medium text-white">{c.nome}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Categorias</h1>
        <p className="text-sm text-slate-400 mt-1">Gerencie suas categorias financeiras</p>
      </div>
      {renderGroup('Receitas', receitas, 'text-emerald-400')}
      {renderGroup('Despesas', despesas, 'text-red-400')}
    </motion.div>
  );
}
