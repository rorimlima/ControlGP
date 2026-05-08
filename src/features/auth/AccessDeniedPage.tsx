import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Mail } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen gradient-dark gradient-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-8 md:p-12 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Acesso Não Autorizado</h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Seu email ainda não foi autorizado para acessar o Control GP.
          Para adquirir o sistema, entre em contato conosco.
        </p>

        <div className="card p-4 mb-6 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <Mail className="w-4 h-4" />
            <span>Contato: onaeror@gmail.com</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link to="/" className="btn-primary py-3 flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar ao início
          </Link>
          <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors py-2">
            Tentar com outro email
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
