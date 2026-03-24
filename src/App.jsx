import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import SuperAdminHome from './pages/SuperAdminHome';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PendingApprovalScreen from '@/components/PendingApprovalScreen';
import AppLayout from './components/layout/AppLayout';
import MunicipalityDashboard from './pages/MunicipalityDashboard';
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
import DocumentVault from './pages/DocumentVault';
import AdminTools from './pages/AdminTools';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import MunicipalitySetup from './pages/MunicipalitySetup';

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'pending_approval') {
      return <PendingApprovalScreen />;
    } else if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Allow public portal without login
      if (window.location.pathname === '/public-portal') {
        return <Routes><Route path="/public-portal" element={<PublicPortal />} /></Routes>;
      }
      navigateToLogin();
      return null;
    }
  }

  // Superadmins see hub at root
  if (user && user.role === 'superadmin' && !user.municipality_id) {
    return (
      <Routes>
        <Route path="/" element={<SuperAdminHome />} />
        <Route path="/municipality/:municipalityId/*" element={<AppLayout />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  // Regular users redirected to their municipality dashboard
  if (user && user.municipality_id && window.location.pathname === '/') {
    return <Navigate to={`/municipality/${user.municipality_id}/dashboard`} />;
  }

  // Block access if user is authenticated but not assigned to a municipality (and not superadmin)
  if (user && !user.municipality_id && user.role !== 'superadmin') {
    return <PendingApprovalScreen />;
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<SuperAdminHome />} />
        <Route path="/municipality/:municipalityId/dashboard" element={<MunicipalityDashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/new-complaint" element={<NewComplaint />} />
        <Route path="/investigations" element={<Investigations />} />
        <Route path="/deadlines" element={<Deadlines />} />
        <Route path="/court-actions" element={<CourtActions />} />
        <Route path="/wizard" element={<ActionWizard />} />
        <Route path="/compass" element={<CompassPage />} />
        <Route path="/resources" element={<ResourceLibrary />} />
        <Route path="/public-portal" element={<PublicPortal />} />
        <Route path="/documents" element={<DocumentVault />} />
        <Route path="/admin" element={<AdminTools />} />

        <Route path="/setup" element={<MunicipalitySetup />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App