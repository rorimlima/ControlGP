import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Shield, Wifi, WifiOff, Smartphone, BarChart3,
  CreditCard, Target, ArrowRight, Check, Zap, Lock, Globe,
  ChevronDown, Star,
} from 'lucide-react';

const features = [
  { icon: WifiOff, title: 'Offline-First', desc: 'Funciona sem internet. Seus dados ficam salvos localmente.' },
  { icon: Wifi, title: 'Sincronização Automática', desc: 'Sincroniza automaticamente quando a conexão retornar.' },
  { icon: Shield, title: 'Segurança Enterprise', desc: 'Criptografia ponta-a-ponta, JWT e Row Level Security.' },
  { icon: Smartphone, title: 'Mobile-First', desc: 'Experiência nativa em qualquer dispositivo. Instale como app.' },
  { icon: BarChart3, title: 'Dashboard Inteligente', desc: 'Gráficos e indicadores financeiros em tempo real.' },
  { icon: Zap, title: 'Performance Extrema', desc: 'Carregamento ultra rápido com cache inteligente.' },
];

const modules = [
  { icon: BarChart3, title: 'Dashboard', desc: '8 indicadores financeiros e 4 gráficos interativos' },
  { icon: TrendingUp, title: 'Lançamentos', desc: 'Receitas, despesas e transferências com competência e caixa' },
  { icon: CreditCard, title: 'Cartões', desc: 'Faturas, limites e parcelamentos organizados' },
  { icon: Target, title: 'Metas', desc: 'Acompanhe seus objetivos financeiros com progresso visual' },
];

const plans = [
  {
    name: 'Básico',
    price: 'R$ 29,90',
    period: '/mês',
    features: ['Dashboard completo', 'Lançamentos ilimitados', 'Contas bancárias', 'Categorias', 'Offline-first', 'Suporte email'],
    featured: false,
  },
  {
    name: 'Premium',
    price: 'R$ 49,90',
    period: '/mês',
    features: ['Tudo do Básico', 'Cartões de crédito', 'Metas financeiras', 'Relatórios avançados', 'Exportar PDF/Excel', 'Suporte prioritário'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'R$ 99,90',
    period: '/mês',
    features: ['Tudo do Premium', 'Multi-dispositivo', 'API integrations', 'Importação OFX/CSV', 'Push notifications', 'Suporte 24/7'],
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-white overflow-x-hidden">
      {/* ============================================================ */}
      {/* NAVBAR */}
      {/* ============================================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Control <span className="text-blue-400">GP</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Recursos</a>
            <a href="#modules" className="hover:text-white transition-colors">Módulos</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link to="/registro" className="btn-primary text-sm px-5 py-2">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* HERO */}
      {/* ============================================================ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
              <Zap className="w-3.5 h-3.5" />
              PWA Offline-First • Instalável • Multi-dispositivo
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight mb-6">
              Gestão Financeira{' '}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                Inteligente
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Controle suas finanças pessoais com tecnologia enterprise.
              Funciona offline, sincroniza automaticamente e oferece
              segurança de nível corporativo.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/registro"
                className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Começar agora <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 py-3"
              >
                Conhecer recursos <ChevronDown className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* Floating stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
          >
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '<100ms', label: 'Loading' },
              { value: '256-bit', label: 'Encryption' },
            ].map((stat) => (
              <div key={stat.label} className="glass-light rounded-2xl p-4 text-center">
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES */}
      {/* ============================================================ */}
      <section id="features" className="py-20 md:py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm text-blue-400 font-medium mb-3">RECURSOS</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tecnologia de ponta para suas finanças</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Construído com as melhores práticas da indústria para garantir performance, segurança e confiabilidade.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="card p-6 group hover:border-blue-500/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* MODULES */}
      {/* ============================================================ */}
      <section id="modules" className="py-20 md:py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm text-purple-400 font-medium mb-3">MÓDULOS</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa em um só lugar</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {modules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div
                  key={mod.title}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="card p-6 flex items-start gap-4 hover:border-purple-500/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">{mod.title}</h3>
                    <p className="text-sm text-slate-400">{mod.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PRICING */}
      {/* ============================================================ */}
      <section id="pricing" className="py-20 md:py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm text-emerald-400 font-medium mb-3">PLANOS</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Escolha o plano ideal para você</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`card p-6 relative ${plan.featured ? 'border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : ''}`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-brand text-xs font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3" /> Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-slate-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/registro"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.featured
                      ? 'btn-primary'
                      : 'border border-[var(--color-dark-border)] text-slate-300 hover:bg-[var(--color-dark-hover)]'
                  }`}
                >
                  Começar agora
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA */}
      {/* ============================================================ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card p-10 md:p-14 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Pronto para controlar suas finanças?</h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">Junte-se a milhares de pessoas que já transformaram sua vida financeira com o Control GP.</p>
              <Link to="/registro" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
                Criar conta grátis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold">Control <span className="text-blue-400">GP</span></span>
          </div>
          <p className="text-xs text-slate-600">© 2026 Control GP. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Seguro</span>
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> PWA</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> LGPD</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
