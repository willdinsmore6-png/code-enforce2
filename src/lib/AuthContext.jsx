import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [municipality, setMunicipality] = useState(null);
  const [impersonatedMunicipality, setImpersonatedMunicipality] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('impersonated_town') || 'null');
    } catch {
      return null;
    }
  });

  const loadMunicipality = useCallback(async (currentUser) => {
    const u = currentUser || user;
    const townId = u?.town_id || u?.data?.town_id;

    if (!townId) {
      setMunicipality(null);
      return null;
    }

    const config = await base44.entities.TownConfig.get(townId);
    setMunicipality(config || null);
    return config || null;
  }, [user]);

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);

      const currentUser = await base44.auth.me();

      if (currentUser) {
        currentUser.town_id = currentUser.data?.town_id || currentUser.town_id || null;
      }

      setUser(currentUser);
      setIsAuthenticated(!!currentUser);

      if (currentUser?.town_id && currentUser.town_id !== 'Null') {
        await loadMunicipality(currentUser);
      } else {
        setMunicipality(null);
      }

      if (currentUser && !currentUser.invitation_accepted) {
        await base44.auth.updateMe({ invitation_accepted: true });
      }
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setMunicipality(null);

      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, [loadMunicipality]);

  const checkAppState = useCallback(async () => {
    if (window.location.pathname.includes('public-portal')) {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthError(null);
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

      const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
      setAppPublicSettings(publicSettings);

      if (appParams.token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);
        setMunicipality(null);
      }
    } catch (appError) {
      console.error('App state check failed:', appError);

      if (appError.status === 403 && appError.data?.extra_data?.reason) {
        const reason = appError.data.extra_data.reason;
        setAuthError({
          type: reason,
          message: reason === 'auth_required' ? 'Authentication required' : appError.message
        });
      } else {
        setAuthError({
          type: 'unknown',
          message: appError.message || 'Failed to load app'
        });
      }

      setIsLoadingAuth(false);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  function impersonateMunicipality(town) {
    setImpersonatedMunicipality(town);
    sessionStorage.setItem('impersonated_town', JSON.stringify(town));

    setUser(prev => {
      if (!prev) return prev;
      sessionStorage.setItem('original_user_town_id', prev.town_id || '');
      return { ...prev, town_id: town.id };
    });

    setMunicipality(town);
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
    setMunicipality(null);

    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const activeMunicipality = impersonatedMunicipality || municipality;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        municipality: activeMunicipality,
        refreshMunicipality: () => loadMunicipality(),
        impersonatedMunicipality,
        impersonateMunicipality,
        clearImpersonation,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};