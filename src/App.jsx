import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

// Layout & Access Logic Components
import AppLayout from './components/layout/AppLayout';
import UnassignedUserScreen from './components/UnassignedUserScreen';
import UserNotRegisteredError from './components/UserNotRegisteredError';
import PendingApprovalScreen from './components/PendingApprovalScreen';

// Page Imports
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

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const navigate = useNavigate();

  // --- 1. HOOKS AT TOP LEVEL (NO EARLY RETURNS ABOVE THIS) ---
  useEffect(() => {
    const path = window.location.pathname;
    const isPublicPath = ['/public-portal', '/report', '/onboarding', '/subscribe', '/success'].includes(path);

    // ACTION: If not loading and NO user, force redirect to login via URL
    if (!isLoadingAuth && !isLoadingPublicSettings && !user && !authError && !isPublicPath) {
      window.location.href = '/login'; 
      return;
    }

    // SuperAdmin Bypass: Let them through everything
    if (!user || user.role === 'superadmin' || authError) return;

    const townId = user?.town_id;
    const isActive = user?.municipality?.is_active;

    // Redirect regular users if their town is inactive
    if (townId && !isActive && !isPublicPath) {
      navigate('/subscribe');
    }
  }, [user, navigate, authError, isLoadingAuth, isLoadingPublicSettings]);

  // --- 2. LOADING STATE ---
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- 3. ACCESS GATES (ERROR SCREENS) ---
  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'unassigned_user') return <UnassignedUserScreen />;
    if (authError.type === 'pending_approval') return <PendingApprovalScreen />;
  }

  // --- 4. PREVENT RENDERING DASHBOARD FOR LOGGED OUT USERS ---
  const path = window.location.pathname;
  const isPublicPath = ['/public-portal', '/report', '/onboarding', '/subscribe', '/success'].includes(path);
  
  if (!user && !isPublicPath) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/public-portal" element={<PublicPortal />} />
      <Route path="/report" element={<Report />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />

      {/* Protected Layout */}
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
          <a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
