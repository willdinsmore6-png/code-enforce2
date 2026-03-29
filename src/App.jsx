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

  useEffect(() => {
    if (loading || !user) return;

    // 1. SUPERADMIN BYPASS: If you are the boss, ignore all gates
    if (user.role === 'superadmin') return;

    const townId = user?.data?.town_id || user?.town_id;
    const isActive = user?.municipality?.is_active;

    // 2. Gatekeeper Logic for regular users
    if (!townId && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    } else if (townId && !isActive) {
      // Allow them to stay on /success or /subscribe, otherwise force /subscribe
      if (location.pathname !== '/success' && location.pathname !== '/subscribe') {
        navigate('/subscribe');
      }
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public/System Routes */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />
      <Route path="/login" element={<div className="h-screen bg-slate-900" />} />
      
      {/* Protected Main App */}
      <Route 
        path="/" 
        element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
