import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import NewComplaint from './pages/NewComplaint';
import Investigations from './pages/Investigations';
import Deadlines from './pages/Deadlines';
import CourtActions from './pages/CourtActions';
import ActionWizard from './pages/ActionWizard';
import CompassPage from './pages/Compass';
import ResourceLibrary from './pages/ResourceLibrary';
import PublicPortal from './pages/PublicPortal';
import Report from './pages/Report';
import DocumentVault from './pages/DocumentVault';
import AdminTools from './pages/AdminTools';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import PageNotFound from './lib/PageNotFound';
import Onboarding from './pages/Onboarding';
import Subscribe from './pages/Subscribe';
import Success from './pages/Success';

const PUBLIC_ROUTES = ['/public-portal', '/report'];
const GATED_ROUTES = ['/onboarding', '/subscribe', '/success'];

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, municipality, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;

    const path = location.pathname;
    const isPublicRoute = PUBLIC_ROUTES.some(r => path.startsWith(r));
    const isGatedRoute = GATED_ROUTES.some(r => path.startsWith(r));

    if (!user) {
      if (!isPublicRoute) navigateToLogin();
      return;
    }

    if (user.role === 'superadmin') return;

    const townId = user?.town_id || user?.data?.town_id;
    const isActive = municipality?.is_active === true;

    if (!townId) {
      if (path !== '/onboarding') navigate('/onboarding', { replace: true });
      return;
    }

    if (!isActive) {
      if (path !== '/subscribe' && path !== '/success') {
        navigate('/subscribe', { replace: true });
      }
      return;
    }

    if (isGatedRoute) {
      navigate('/', { replace: true });
    }
  }, [user, isLoadingAuth, isLoadingPublicSettings, municipality, navigate, location.pathname, navigateToLogin]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/public-portal" element={<PublicPortal />} />
      <Route path="/report" element={<Report />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/new-complaint" element={<NewComplaint />} />
        <Route path="/investigations" element={<Investigations />} />
        <Route path="/deadlines" element={<Deadlines />} />
        <Route path="/court-actions" element={<CourtActions />} />
        <Route path="/wizard" element={<ActionWizard />} />
        <Route path="/compass" element={<CompassPage />} />
        <Route path="/resources" element={<ResourceLibrary />} />
        <Route path="/documents" element={<DocumentVault />} />
        <Route path="/admin" element={<AdminTools />} />
        <Route path="/superadmin" element={<SuperAdminDashboard />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <a href="#main-content" className="skip-to-main">Skip to main content</a>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}