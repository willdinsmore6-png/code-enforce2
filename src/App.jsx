import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Import existing page components
import Dashboard from './pages/Dashboard';
import Subscribe from './pages/Subscribe';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Wait for Auth to finish loading
    if (loading || !user) return;

    const townId = user?.data?.town_id || user?.town_id;
    const isActive = user?.municipality?.is_active;

    // 2. Logic: No Town? -> Onboarding. 2. Not Paid? -> Subscribe.
    if (!townId) {
      navigate('/onboarding');
    } else if (!isActive) {
      // Allow them to visit the success bridge if they just paid
      const path = window.location.pathname;
      if (path !== '/success' && path !== '/subscribe') {
        navigate('/subscribe');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-slate-400 text-sm animate-pulse">Loading CodeEnforce Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Route for users waiting for admin setup */}
      <Route path="/onboarding" element={<Onboarding />} />
      
      {/* Route for users who need to pay */}
      <Route path="/subscribe" element={<Subscribe />} />

      {/* Success bridge for immediate activation */}
      <Route path="/success" element={<Success />} />
      
      {/* Main Dashboard - Protected by logic above */}
      <Route 
        path="/" 
        element={user ? <Dashboard /> : <Navigate to="/login" />} 
      />

      {/* Fallback for system login path */}
      <Route path="/login" element={<div className="h-screen bg-slate-900" />} />
      
      {/* Catch-all: Send back to Home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
