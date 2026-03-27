import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PendingApprovalScreen from '@/components/PendingApprovalScreen';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Allow public portal without auth—skip auth checks for that route
  if (window.location.pathname === '/public-portal' || window.location.pathname === '/report') {
    return <Routes>
      <Route path="/public-portal" element={<PublicPortal />} />
      <Route path="/report" element={<Report />} />
    </Routes>;
  }

  // Handle authentication errors for other routes
  if (authError) {
    if (authError.type === 'pending_approval') {
      return <PendingApprovalScreen />;
    } else if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/public-portal" element={<PublicPortal />} />
      <Route path="/report" element={<Report />} />
      
      {/* Protected routes */}
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
          <a href="#main-content" className="skip-to-main">Skip to main content</a>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App