import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Page Imports
import Dashboard from './pages/Dashboard';
import Subscribe from './pages/Subscribe';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect if we are in Base44 Preview mode or have Superadmin role
  const isPreview = window.location.hostname.includes('base44.app') || 
                    window.location.hostname.includes('localhost');
  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    // 1. Wait for Auth to finish loading
    if (loading) return;

    // --- SUPERVISORY BYPASS ---
    // If you are in the editor preview or logged in as Superadmin, 
    // disable all gates and allow free navigation.
    if (isPreview || isSuperadmin) return;

    // 2. Gatekeeper Logic for regular users
    if (!user) return; // Let fallback handle non-logged-in users

    const townId = user?.data?.town_id || user?.town_id;
    const isActive = user?.municipality?.is_active;

    if (!townId && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    } else if (townId && !isActive) {
      if (location.pathname !== '/success' && location.pathname !== '/subscribe') {
        navigate('/subscribe');
      }
    }
  }, [user, loading, navigate, location.pathname, isPreview, isSuperadmin]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* All pages are now available to you in Preview mode */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />
      <Route path="/login" element={<div className="h-screen bg-slate-900" />} />
      
      {/* 
          Main App - accessible to you automatically now.
          Regular users will still be gated by the useEffect logic above.
      */}
      <Route path="/" element={<Dashboard />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
