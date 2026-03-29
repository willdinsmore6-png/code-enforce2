import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Page Imports
import Dashboard from './pages/Dashboard';
import Subscribe from './pages/Subscribe';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';

// Layout Component (This is what provides your menu)
import MainLayout from './components/MainLayout'; // Ensure this matches your component's name

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Development/Preview Bypass
  const isPreview = window.location.hostname.includes('base44.app') || 
                    window.location.hostname.includes('localhost');
  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    if (loading) return;
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

  if (loading) return <div className="h-screen bg-slate-900" />;

  return (
    <Routes>
      {/* Pages without a sidebar (Onboarding/Payment) */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />
      <Route path="/login" element={<div className="h-screen bg-slate-900" />} />
      
      {/* Pages WITH the sidebar menu */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        {/* Add other protected routes here */}
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
