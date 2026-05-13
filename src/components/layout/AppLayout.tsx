import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import SyncIndicator from './SyncIndicator';
import { useAppStore } from '@/stores/app-store';

export default function AppLayout() {
  const { isMobile, sidebarOpen, sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <div
      className="min-h-screen gradient-dark gradient-mesh"
      style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}
    >
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      {/* Mobile sidebar overlay — closes on tap outside */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <>
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sidebar-overlay"
              onClick={toggleSidebar}
            />
            <motion.div
              key="sidebar-drawer"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-full z-40"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main
        className="main-content transition-all duration-300"
        style={{
          paddingTop: 'var(--spacing-navbar)',
          marginLeft: isMobile
            ? 0
            : sidebarCollapsed
            ? 'var(--spacing-sidebar-collapsed)'
            : 'var(--spacing-sidebar)',
          // Prevent content from overflowing on mobile
          width: isMobile
            ? '100%'
            : undefined,
          overflowX: 'hidden',
        }}
      >
        <div
          className="p-3 md:p-6"
          style={{ maxWidth: '1400px', margin: '0 auto', overflowX: 'hidden' }}
        >
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav — mobile only */}
      {isMobile && <BottomNav />}

      {/* Sync Status */}
      <SyncIndicator />
    </div>
  );
}
