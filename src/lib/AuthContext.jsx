import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { isUnassignedAllowedPath, shouldSkipAuthBootstrap } from '@/lib/authRoutePolicy';
import { getPostLoginReturnUrl } from '@/lib/loginReturnUrl';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [municipality, setMunicipality] = useState(null);
  const [impersonatedMunicipality, setImpersonatedMunicipality] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('impersonated_town') || 'null'); } catch { return null; }
  });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // Public portal: skip public-settings fetch (often 403 / auth_required for anonymous users on Base44).
    // Still load the signed-in user when a token exists so staff keep their session on these pages.
    if (shouldSkipAuthBootstrap(window.location.pathname)) {
      setAuthError(null);
      setIsLoadingPublicSettings(false);
      if (appParams.token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
      return;
    }

    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        // This is where maintenance status (is_maintenance_active) is fetched
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          setAuthError({
            type: reason === 'auth_required' ? 'auth_required' : (reason === 'user_not_registered' ? 'user_not_registered' : reason),
            message: appError.message
          });
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const loadMunicipality = async (currentUser) => {
    try {
      const u = currentUser || user;
      if (!u?.town_id || u.town_id === 'Null') return;

      const config = await base44.entities.TownConfig.get(u.town_id);
      
      if (config) {
        const isActuallyActive = String(config.is_active).toLowerCase() === 'true' || config.is_active === true;
        const updatedConfig = { ...config, is_active: isActuallyActive };
        setMunicipality(updatedConfig);
        // Subscription redirect is handled in App.jsx only (avoids duplicate navigate / hard reload)
      }
    } catch (e) {
      console.error('Failed to load municipality:', e);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      
      if (currentUser) {
        currentUser.town_id = currentUser.data?.town_id || currentUser.town_id;
        setUser(currentUser);
        setIsAuthenticated(true);

        if (currentUser.role === 'superadmin') {
          setIsLoadingAuth(false);
          return;
        }

        if (currentUser.status === 'pending') {
          setAuthError({ type: 'pending_approval', message: 'Waiting for admin approval' });
        } else if (!currentUser.town_id || currentUser.town_id === 'Null') {
          const p = window.location.pathname;
          if (!isUnassignedAllowedPath(p)) {
            setAuthError({ type: 'unassigned_user', message: 'Account not linked' });
          }
        } else {
          await loadMunicipality(currentUser);
        }

        try {
          if (!currentUser.invitation_accepted) {
            await base44.auth.updateMe({ invitation_accepted: true });
          }
        } catch (e) {
          console.warn('invitation_accepted update skipped:', e);
        }
      }
      setIsLoadingAuth(false);
    } catch (error) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  function impersonateMunicipality(town) {
    setImpersonatedMunicipality(town);
    sessionStorage.setItem('impersonated_town', JSON.stringify(town));
    setUser(prev => {
      if (!prev) return prev;
      sessionStorage.setItem('original_user_town_id', prev.town_id || '');
      return { ...prev, town_id: town.id };
    });
  }

  function clearImpersonation() {
    setImpersonatedMunicipality(null);
    sessionStorage.removeItem('impersonated_town');
    const originalTownId = sessionStorage.getItem('original_user_town_id');
    sessionStorage.removeItem('original_user_town_id');
    setUser(prev => prev ? { ...prev, town_id: originalTownId || null } : prev);
  }

  const logout = (shouldRedirect = true) => {
    clearImpersonation();
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(shouldRedirect ? window.location.href : undefined);
  };

  const navigateToLogin = () => base44.auth.redirectToLogin(getPostLoginReturnUrl());

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError,
      appPublicSettings, municipality: impersonatedMunicipality || municipality,
      refreshMunicipality: () => loadMunicipality(), impersonatedMunicipality,
      impersonateMunicipality, clearImpersonation, logout, navigateToLogin, checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
