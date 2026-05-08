import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check, AlertTriangle, WifiOff } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

export default function SyncIndicator() {
  const { isSyncing, isOnline, pendingSyncCount } = useAppStore();

  const showIndicator = isSyncing || !isOnline || pendingSyncCount > 0;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 md:bottom-6 right-4 z-50"
        >
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-sm shadow-lg">
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-blue-300">Sincronizando...</span>
              </>
            ) : !isOnline ? (
              <>
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300">Modo offline</span>
              </>
            ) : pendingSyncCount > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300">{pendingSyncCount} pendente(s)</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Sincronizado</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
