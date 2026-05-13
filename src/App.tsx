import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { startAutoSync } from '@/lib/sync-engine';
import AuthLayout from '@/features/auth/AuthLayout';
import AppLayout from '@/components/layout/AppLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Lazy loaded pages
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const AccessDeniedPage = lazy(() => import('@/features/auth/AccessDeniedPage'));
const AdminPage = lazy(() => import('@/features/admin/AdminPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const LancamentosPage = lazy(() => import('@/features/lancamentos/LancamentosPage'));
const ContasPage = lazy(() => import('@/features/contas/ContasPage'));
const CategoriasPage = lazy(() => import('@/features/categorias/CategoriasPage'));
const CartoesPage = lazy(() => import('@/features/cartoes/CartoesPage'));
const MetasPage = lazy(() => import('@/features/metas/MetasPage'));
const ConfiguracoesPage = lazy(() => import('@/features/configuracoes/ConfiguracoesPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthorized, isLoading } = useAuthStore();
  
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAuthorized === false) return <Navigate to="/acesso-negado" replace />;
  
  return <>{children}</>;
}

export default function App() {
  const { initialize, isAuthenticated } = useAuthStore();
  const { setIsOnline, setIsMobile } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      startAutoSync(30000);
    }
  }, [isAuthenticated]);

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  // Responsive detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Landing Page — public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Access Denied */}
        <Route path="/acesso-negado" element={<AccessDeniedPage />} />

        {/* Admin Panel — Control Master GP */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/lancamentos" element={<LancamentosPage />} />
          <Route path="/contas" element={<ContasPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/cartoes" element={<CartoesPage />} />
          <Route path="/metas" element={<MetasPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
