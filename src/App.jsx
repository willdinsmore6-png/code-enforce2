import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Added button

import AppLayout from './components/layout/AppLayout';
import UnassignedUserScreen from './components/UnassignedUserScreen';
import UserNotRegisteredError from './components/UserNotRegisteredError';
import PendingApprovalScreen from './components/PendingApprovalScreen';

import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import NewComplaint from './pages/NewComplaint';
import Investigations from './pages/Investigations';
import Deadlines from './pages/Deadlines';
import CourtActions from './pages/CourtActions';
import CompassPage from './pages/Compass';
import ResourceLibrary from './pages/ResourceLibrary';
import PublicPortal from './pages/PublicPortal';
import Report from './pages/Report';
import DocumentVault from './pages/DocumentVault';
import ZoningDeterminations from './pages/ZoningDeterminations';
import ZoningDeterminationDetail from './pages/ZoningDeterminationDetail';
import AdminTools from './pages/AdminTools';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import PageNotFound from './lib/PageNotFound';
import Onboarding from './pages/Onboarding';
import Subscribe from './pages/Subscribe';
import Success from './pages/Success';
import LandingRoute from './pages/LandingPage';
import {
  isPublicAppPath,
  isTownInactive,
  userHasNoTown,
  isUnassignedAllowedPath,
  isInactiveSubscriptionAllowedPath,
  isBlockingAuthError,
} from '@/lib/authRoutePolicy';
import { base44 } from '@/api/base44Client';
import { getPostLoginReturnUrl } from '@/lib/loginReturnUrl';

const AuthenticatedApp = () => {
  const {
    user,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    municipality,
    appPublicSettings,
    logout,
    impersonatedMunicipality,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;
  const publicPath = isPublicAppPath(path);

  /** One navigation matrix: login, unassigned, inactive subscription (no duplicates with AuthContext). */
  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;

    if (isBlockingAuthError(authError)) return;

    if (!user && !authError && !publicPath) {
      base44.auth.redirectToLogin(getPostLoginReturnUrl());
      return;
    }

    if (!user || user.role === 'superadmin') return;

    if (userHasNoTown(user)) {
      if (!isUnassignedAllowedPath(path)) {
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    if (municipality && isTownInactive(municipality)) {
      if (!isInactiveSubscriptionAllowedPath(path)) {
        navigate('/subscribe', { replace: true });
      }
    }
  }, [
    user,
    municipality,
    authError,
    navigate,
    isLoadingAuth,
    isLoadingPublicSettings,
    path,
    publicPath,
  ]);

  /** Superadmin without an active town impersonation: only global dashboard inside the app shell. */
  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings || !user) return;
    if (user.role !== 'superadmin' || impersonatedMunicipality) return;
    if (publicPath) return;
    if (path === '/superadmin' || path.startsWith('/superadmin/')) return;
    navigate('/superadmin', { replace: true });
  }, [
    user,
    impersonatedMunicipality,
    path,
    publicPath,
    isLoadingAuth,
    isLoadingPublicSettings,
    navigate,
  ]);

  // --- MAINTENANCE GUARD ---
  const isMaintenanceActive = appPublicSettings?.is_maintenance_active === true;
  const isSuperAdmin = user?.role === 'superadmin';

  // If maintenance is ON, and user is NOT a SuperAdmin, and they aren't on a public route: LOCK THEM OUT
  if (isMaintenanceActive && !isSuperAdmin && !publicPath && !isLoadingPublicSettings && !isLoadingAuth) {
    return (
      <div
        className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="max-w-md w-full space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative">
            <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
              <Clock className="w-12 h-12 text-amber-500" aria-hidden="true" />
            </div>
            <div className="absolute top-0 right-1/4 w-3 h-3 bg-red-500 rounded-full animate-ping motion-reduce:animate-none" aria-hidden="true" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight">System Update</h1>
            <div className="h-1 w-12 bg-amber-500 mx-auto rounded-full" />
            <p className="text-slate-400 text-lg leading-relaxed">
              {appPublicSettings?.maintenance_notice || "We're currently fine-tuning the platform for a better experience."}
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <p className="text-sm font-medium text-slate-300 italic">
              Dashboard access is temporarily restricted.
            </p>
          </div>

          <Button variant="ghost" onClick={() => logout()} className="text-slate-500 hover:text-white">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900" role="status" aria-live="polite">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading application…</span>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'unassigned_user') return <UnassignedUserScreen />;
    if (authError.type === 'pending_approval') return <PendingApprovalScreen />;
  }
  
  if (!user && !publicPath) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900" role="status" aria-live="polite">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">Signing in…</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/public-portal" element={<PublicPortal />} />
      <Route path="/report" element={<Report />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/zoning-determinations" element={<ZoningDeterminations />} />
        <Route path="/zoning-determinations/:id" element={<ZoningDeterminationDetail />} />
        <Route path="/new-complaint" element={<NewComplaint />} />
        <Route path="/investigations" element={<Investigations />} />
        <Route path="/deadlines" element={<Deadlines />} />
        <Route path="/court-actions" element={<CourtActions />} />
        <Route path="/wizard" element={<Navigate to="/deadlines" replace />} />
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
          <Toaster />
          <AuthenticatedApp />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}
