import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Page Imports
import Dashboard from './pages/Dashboard';
import Subscribe from './pages/Subscribe';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';

// --- THE CRITICAL FIX: Explicit relative path with extension ---
import Sidebar from './components/sidebar.jsx'; 

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // supervisory / Preview Bypass
  const isPreview = window.location.hostname.includes('base44.app') || 
                    window.location.hostname.includes('localhost');
  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    if (loading || !user) return;
    
    // --- SUPERVISORY BYPASS ---
    // If you are the boss or in editor mode, don't redirect to onboarding
    if (isPreview || isSuperadmin) return;

    const townId = user?.data?.town_id || user?.town_id;
    const isActive = user?.municipality?.is_active;

    // Gatekeeper Logic for regular users
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
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  // --- RESTORED LAYOUT WRAPPER ---
  // This creates the flex container that puts the menu on the left 
  // and your content on the right, exactly as it was this morning.
  const LayoutWrapper = () => (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-white font-sans">
      <Sidebar user={user} /> 
      <div className="flex-1 overflow-auto bg-slate-900">
        <Outlet />
      </div>
    </div>
  );

  return (
    <Routes>
      {/* Pages WITHOUT the sidebar (Onboarding/Payment) */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />
      <Route path="/login" element={<div className="h-screen bg-slate-900" />} />
      
      {/* 
          Pages WITH the sidebar menu 
          Dashboard and your other sub-pages go here
      */}
      <Route element={<LayoutWrapper />}>
        <Route path="/" element={<Dashboard />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
