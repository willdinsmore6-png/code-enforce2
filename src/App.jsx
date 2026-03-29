import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Page Imports
import Dashboard from './pages/Dashboard';
import Subscribe from './pages/Subscribe';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';

// THE FIX: Direct relative path to your sidebar file
import Sidebar from './components/sidebar.jsx'; 

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Bypasses for you (Superadmin) and the Editor Preview
  const isPreview = window.location.hostname.includes('base44.app') || 
                    window.location.hostname.includes('localhost');
  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    if (loading || !user || isPreview || isSuperadmin) return;

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

  if (loading) return <div className="h-screen bg-slate-900" />;

  // This puts the sidebar back on the left and content on the right
  const LayoutWrapper = () => (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <Sidebar user={user} /> 
      <div className="flex-1 overflow-auto bg-slate-900">
        <Outlet />
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />
      
      {/* Dashboard WITH Sidebar */}
      <Route element={<LayoutWrapper />}>
        <Route path="/" element={<Dashboard />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
