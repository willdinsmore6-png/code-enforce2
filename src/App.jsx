import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import Subscribe from './pages/Subscribe';
import Onboarding from './pages/Onboarding'; // You'll create this file next
// ... other imports

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      const townId = user?.data?.town_id || user?.town_id;
      
      // If the user has no town_id, force them to the onboarding info page
      if (!townId) {
        navigate('/onboarding');
      }
    }
  }, [user, loading, navigate]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/subscribe" element={<Subscribe />} />
      {/* 
          If user has town_id but is not active, your Subscribe page 
          already handles that redirect logic.
      */}
      <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      {/* ... other routes ... */}
    </Routes>
  );
}
