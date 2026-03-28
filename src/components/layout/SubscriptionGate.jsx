import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function SubscriptionGate({ children }) {
  const { user, municipality, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) return;
    // Superadmins bypass paywall
    if (user.role === 'superadmin') return;
    // If municipality is loaded and inactive, redirect to subscribe
    if (municipality && municipality.is_active === false) {
      navigate('/subscribe', { replace: true });
    }
  }, [user, municipality, isLoadingAuth, location.pathname]);

  return children;
}