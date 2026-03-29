import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// --- FIXED IMPORT: Points to the actual file in your repo ---
import Sidebar from '@/components/sidebar'; 

// Original Page Imports
import Dashboard from '@/pages/Dashboard';
import Cases from '@/pages/Cases';
import Investigations from '@/pages/Investigations';
import AdminTools from '@/pages/AdminTools';

// The new gates we added
import Subscribe from '@/pages/Subscribe';
import Onboarding from '@/pages/Onboarding';
import Success from '@/pages/Success';

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user) return;

    // --- SUPERADMIN BYPASS (Restores your supervisory view) ---
    if (user.role === 'superadmin') return;

    const townId = user?.data?.town_id || user?.town_id;
    const isActive = user?.municipality?.is_active;

    // The Gates (Only for regular users)
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

  // --- RESTORED LAYOUT WRAPPER ---
  const LayoutWrapper = () => (
    <div className="flex h-screen bg-slate-900 overflow-hidden font-sans">
      <Sidebar user={user} /> 
      <div className="flex-1 overflow-auto bg-slate-900">
        <Outlet />
      </div>
    </div>
  );

  return (
    <Routes>
      {/* System Pages (No Sidebar) */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/success" element={<Success />} />
      <Route path="/login" element={<div className="h-screen bg-slate-900" />} />

      {/* --- RESTORED: Your Original Sidebar Menu Structure --- */}
      <Route element={<LayoutWrapper />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/investigations" element={<Investigations />} />
        
        {/* Only show Admin Tools in menu if user is admin/superadmin */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <Route path="/admin" element={<AdminTools />} />
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
