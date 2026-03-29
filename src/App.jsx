import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Page Imports
import Dashboard from './pages/Dashboard';
import Subscribe from './pages/Subscribe';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';

// --- FIXED IMPORT: Use lowercase 'sidebar' to match your filename ---
import Sidebar from './components/sidebar'; 

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // supervisory / Preview Bypass
  const isPreview = window.location.hostname.includes('base44.app') || 
                    window.location.hostname.includes('localhost');
  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    if (loading) return;
    
    // Bypass gates for superadmins and in the preview editor
    if (isPreview || isSuperadmin) return;

    if (user) {
      const townId = user?.data?.town_id || user?.town_id;
      const isActive = user?.municipality?.is_active;

      if (!townId && location.pathname !== '/onboarding') {
        navigate('/onboarding');
      } else if (townId && !isActive) {
        if (location.pathname !== '/success' && location.pathname !== '/subscribe') {
          navigate('/subscribe');
        }
      }
    }
  }, [user, loading, navigate, location.pathname, isPreview, isSuperadmin]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  // Wrapper that puts the Sidebar back on the screen
  const LayoutWrapper = () => (
    <div className="flex h-screen bg-slate-900 overflow-hidden font-sans">
      <Sidebar user={user} /> 
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );

  return (
    <Routes>
      {/* Pages WITHOUT the sidebar */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />
      <Route path="/login" element={<div className="h-screen bg-slate-900" />} />
      
      {/* Pages WITH the sidebar menu */}
      <Route element={<LayoutWrapper />}>
        <Route path="/" element={<Dashboard />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
