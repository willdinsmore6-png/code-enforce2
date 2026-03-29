import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// --- THE CRITICAL FIX: Matches your filename exactly ---
import AppLayout from '@/components/AppLayout'; 

// Original Page Imports
import Dashboard from '@/pages/Dashboard';
import Cases from '@/pages/Cases';
import Investigations from '@/pages/Investigations';
import AdminTools from '@/pages/AdminTools';
import Profile from '@/pages/Profile';

// Gatekeeper Pages
import Subscribe from '@/pages/Subscribe';
import Onboarding from '@/pages/Onboarding';
import Success from '@/pages/Success';

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user) return;

    // 1. SUPERADMIN BYPASS: Restores your supervisory overview
    if (user.role === 'superadmin') return;

    const townId = user?.data?.town_id || user?.town_id;
    const isActive = user?.municipality?.is_active;

    // 2. THE GATES (Only for regular users)
    if (!townId && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    } else if (townId && !isActive) {
      if (location.pathname !== '/success' && location.pathname !== '/subscribe') {
        navigate('/subscribe');
      }
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
    </div>
  );

  return (
    <Routes>
      {/* System Pages (No Sidebar/Menu) */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />
      <Route path="/login" element={<div className="h-screen bg-slate-900" />} />

      {/* --- RESTORED ORIGINAL ARCHITECTURE --- */}
      {/* All routes inside AppLayout will show your sidebar menu automatically */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/investigations" element={<Investigations />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Only show Admin Tools in menu if user is admin/superadmin */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <Route path="/admin-tools" element={<AdminTools />} />
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
