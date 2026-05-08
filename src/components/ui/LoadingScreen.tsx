import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center gradient-dark z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ border: '2px solid rgba(59, 130, 246, 0.5)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold text-white">Control GP</h1>
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>

        {/* Loading bar */}
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-brand rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '40%' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
