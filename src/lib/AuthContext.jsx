import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

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
    // Skip auth checks for public portal
    if (window.location.pathname.includes('public-portal')) {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthError(null);
      return;
    }
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // Skip for public portal
    if (window.location.pathname.includes('public-portal')) {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthError(null);
      return;
    }
    
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };



  const loadMunicipality = async (currentUser) => {
    try {
      const u = currentUser || user;
      if (!u?.town_id) return;
      const configs = await base44.entities.TownConfig.filter({ id: u.town_id });
      if (configs[0]) setMunicipality(configs[0]);
    } catch (e) { /* silent */ }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      // Extract town_id from data field if present
      if (currentUser && currentUser.data?.town_id && !currentUser.town_id) {
        currentUser.town_id = currentUser.data.town_id;
      }
      setUser(currentUser);
      setIsAuthenticated(true);
      loadMunicipality(currentUser);

      if (currentUser && !currentUser.invitation_accepted) {
        await base44.auth.updateMe({ invitation_accepted: true });
      }

      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
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
    // Override user.town_id so all RLS-filtered entity queries use the impersonated town
    setUser(prev => {
      if (!prev) return prev;
      sessionStorage.setItem('original_user_town_id', prev.town_id || '');
      return { ...prev, town_id: town.id };
    });
  }

  function clearImpersonation() {
    setImpersonatedMunicipality(null);
    sessionStorage.removeItem('impersonated_town');
    // Restore the real user's town_id
    const originalTownId = sessionStorage.getItem('original_user_town_id');
    sessionStorage.removeItem('original_user_town_id');
    setUser(prev => prev ? { ...prev, town_id: originalTownId || null } : prev);
  }

  const logout = (shouldRedirect = true) => {
    clearImpersonation();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  // When impersonating, expose the impersonated town as municipality
  const activeMunicipality = impersonatedMunicipality || municipality;

  return (
    <AuthContext.Provider value={{ 
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
    }}>
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