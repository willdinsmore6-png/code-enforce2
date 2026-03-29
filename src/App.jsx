import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Page Imports
import Dashboard from './pages/Dashboard';
import Subscribe from './pages/Subscribe';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;

    const townId = user?.data?.town_id || user?.town_id;
    const isActive = user?.municipality?.is_active;

    // Logic: 1. No Town? -> Instructions. 2. Not Paid? -> Stripe.
    if (!townId) {
      navigate('/onboarding');
    } else if (!isActive) {
      navigate('/subscribe');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      
      {/* Protected Dashboard Route */}
      <Route 
        path="/" 
        element={user ? <Dashboard /> : <Navigate to="/login" />} 
      />
      
      {/* Redirect everything else to Home/Dashboard */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
