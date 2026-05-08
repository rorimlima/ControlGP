import { motion } from 'framer-motion';
import { Moon, Sun, Bell, Shield, Database, Globe } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useAppStore();
  const { profile } = useAuthStore();

  const sections = [
    {
      title: 'Aparência', icon: Moon, items: [
        { label: 'Tema', desc: theme === 'dark' ? 'Escuro' : 'Claro', action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      ],
    },
    {
      title: 'Notificações', icon: Bell, items: [
        { label: 'Alertas de vencimento', desc: 'Ativado' },
        { label: 'Alertas de metas', desc: 'Ativado' },
      ],
    },
    {
      title: 'Segurança', icon: Shield, items: [
        { label: 'Autenticação', desc: 'JWT + Refresh Token' },
        { label: 'Criptografia', desc: 'AES-256' },
      ],
    },
    {
      title: 'Dados', icon: Database, items: [
        { label: 'Sincronização', desc: 'Automática (30s)' },
        { label: 'Cache local', desc: 'IndexedDB (Dexie.js)' },
      ],
    },
    {
      title: 'Conta', icon: Globe, items: [
        { label: 'Email', desc: profile?.email || '—' },
        { label: 'Nome', desc: profile?.nome || '—' },
        { label: 'Plano', desc: 'Free' },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-slate-400 mt-1">Personalize sua experiência</p>
      </div>

      {sections.map((section, si) => {
        const Icon = section.icon;
        return (
          <motion.div key={section.title} initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}
            className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-dark-border)] flex items-center gap-2">
              <Icon className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
            </div>
            <div className="divide-y divide-[var(--color-dark-border)]">
              {section.items.map((item) => (
                <div key={item.label}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-[var(--color-dark-hover)] transition-colors cursor-pointer"
                  onClick={item.action}>
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <span className="text-sm text-slate-500">{item.desc}</span>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
