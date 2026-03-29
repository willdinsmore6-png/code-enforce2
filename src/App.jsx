import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

// --- FIXED IMPORT: Matches your lowercase 'layout' folder exactly ---
import AppLayout from './components/layout/AppLayout';

// Original Page Imports
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

// New Onboarding/Payment Pages
import Onboarding from './pages/Onboarding';
import Subscribe from './pages/Subscribe';
import Success from './pages/Success';

const AuthenticatedApp = () => {
  const { user, loading, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;

    // 1. SUPERADMIN BYPASS (Restores your "Supervisory" view)
    if (user.role === 'superadmin') return;

    const townId = user?.data?.town_id || user?.town_id;
    const isActive = user?.municipality?.is_active;

    // 2. THE GATES
    if (!townId && window.location.pathname !== '/onboarding') {
      navigate('/onboarding');
    } else if (townId && !isActive) {
      if (window.location.pathname !== '/success' && window.location.pathname !== '/subscribe') {
        navigate('/subscribe');
      }
    }
  }, [user, loading, navigate]);

  if (isLoadingPublicSettings || isLoadingAuth || loading) {
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
