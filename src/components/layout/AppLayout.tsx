import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import SyncIndicator from './SyncIndicator';
import { useAppStore } from '@/stores/app-store';

export default function AppLayout() {
  const { isMobile, sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen gradient-dark gradient-mesh">
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main
        className="main-content transition-all duration-300 pt-[var(--spacing-navbar)]"
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? 'var(--spacing-sidebar-collapsed)' : 'var(--spacing-sidebar)',
        }}
      >
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
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
