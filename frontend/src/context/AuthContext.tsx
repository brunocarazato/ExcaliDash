import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  authStatus,
  authMe,
  authRefresh,
  authLogout,
  authLogin,
  authRegister,
  isAxiosError,
} from '../api';
import {
  clearStoredUser,
  readStoredUser,
  writeStoredUser,
} from '../utils/authStorage';

interface User {
  id: string;
  username?: string | null;
  email: string;
  name: string;
  role?: "ADMIN" | "USER" | string;
  mustResetPassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authEnabled: boolean | null;
  registrationEnabled: boolean;
  authStatusError: string | null;
  authMode: 'local' | 'hybrid' | 'oidc_enforced';
  oidcEnabled: boolean;
  oidcEnforced: boolean;
  oidcProvider: string | null;
  bootstrapRequired: boolean;
  authOnboardingRequired: boolean;
  authOnboardingMode: 'migration' | 'fresh' | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string, setupCode?: string) => Promise<User>;
  logout: () => void;
  retryAuthStatus: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ENABLED_CACHE_KEY = "excalidash-auth-enabled";

const isAuthUser = (value: unknown): value is User =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as { id?: unknown }).id === "string";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [authStatusError, setAuthStatusError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'local' | 'hybrid' | 'oidc_enforced'>('local');
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcEnforced, setOidcEnforced] = useState(false);
  const [oidcProvider, setOidcProvider] = useState<string | null>(null);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [authOnboardingRequired, setAuthOnboardingRequired] = useState(false);
  const [authOnboardingMode, setAuthOnboardingMode] = useState<'migration' | 'fresh' | null>(null);
  const navigate = useNavigate();

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const isShareFlow = window.location.pathname.startsWith("/shared/");

      try {
        const statusResponse = await authStatus();
        setAuthStatusError(null);
        const enabled =
          typeof statusResponse?.authEnabled === "boolean"
            ? statusResponse.authEnabled
            : typeof statusResponse?.enabled === "boolean"
              ? statusResponse.enabled
              : true;
        setAuthEnabled(enabled);
        localStorage.setItem(AUTH_ENABLED_CACHE_KEY, String(enabled));
        setRegistrationEnabled(Boolean(statusResponse?.registrationEnabled));
        const nextAuthMode =
          statusResponse?.authMode === 'hybrid' || statusResponse?.authMode === 'oidc_enforced'
            ? statusResponse.authMode
            : 'local';
        setAuthMode(nextAuthMode);
        setOidcEnabled(Boolean(statusResponse?.oidcEnabled));
        setOidcEnforced(Boolean(statusResponse?.oidcEnforced));
        setOidcProvider(typeof statusResponse?.oidcProvider === 'string' ? statusResponse.oidcProvider : null);
        setBootstrapRequired(Boolean(statusResponse?.bootstrapRequired));
        setAuthOnboardingRequired(Boolean(statusResponse?.authOnboardingRequired));
        setAuthOnboardingMode(
          statusResponse?.authOnboardingMode === 'migration' || statusResponse?.authOnboardingMode === 'fresh'
            ? statusResponse.authOnboardingMode
            : null
        );

        if (!enabled) {
          clearStoredUser();
          setUser(null);
          return;
        }
      } catch {
        const cachedAuthEnabled = localStorage.getItem(AUTH_ENABLED_CACHE_KEY);
        if (cachedAuthEnabled === "false") {
          setAuthStatusError(null);
          setAuthEnabled(false);
          setRegistrationEnabled(false);
          setAuthMode('local');
          setOidcEnabled(false);
          setOidcEnforced(false);
          setOidcProvider(null);
          setBootstrapRequired(false);
          setAuthOnboardingRequired(false);
          setAuthOnboardingMode(null);
          clearStoredUser();
          setUser(null);
          return;
        }
        setAuthStatusError(
          "Unable to reach the backend API. Check BACKEND_URL, FRONTEND_URL, and your reverse proxy configuration."
        );
        setAuthEnabled(null);
        setRegistrationEnabled(false);
        setAuthMode('local');
        setOidcEnabled(false);
        setOidcEnforced(false);
        setOidcProvider(null);
        setBootstrapRequired(false);
        setAuthOnboardingRequired(false);
        setAuthOnboardingMode(null);
        clearStoredUser();
        setUser(null);
        return;
      }

      // For share-link flows we treat authentication as strictly server-derived.
      // Loading a stale localStorage user causes "logged-in" UI while the server returns 401s,
      // which in turn triggers noisy refresh attempts and failing library saves.
      if (!isShareFlow) {
        const storedUser = readStoredUser<User>();
        if (isAuthUser(storedUser)) {
          setUser(storedUser);
        } else if (storedUser) {
          clearStoredUser();
        }
      }

      try {
        const response = await authMe();
        setUser(response.user);
        writeStoredUser(response.user);
      } catch {
        if (isShareFlow) {
          clearStoredUser();
          setUser(null);
          return;
        }
        try {
          await authRefresh();
          const userResponse = await authMe();
          setUser(userResponse.user);
          writeStoredUser(userResponse.user);
        } catch {
          clearStoredUser();
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setAuthStatusError(
        "Unable to initialize authentication state. Check backend/API connectivity and refresh."
      );
      clearStoredUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      if (authEnabled === false) {
        throw new Error("Authentication is disabled");
      }
      const response = await authLogin(email, password);
      const userData = response?.user;

      if (!isAuthUser(userData)) {
        throw new Error(
          "Login succeeded but the server response was invalid. Check that the frontend and backend are running compatible versions.",
        );
      }

      writeStoredUser(userData);

      setAuthStatusError(null);
      setAuthEnabled(true);
      setUser(userData);
      return userData;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const message =
          typeof error.response?.data === 'object' &&
          error.response.data !== null &&
          'message' in error.response.data &&
          typeof error.response.data.message === 'string'
            ? error.response.data.message
            : 'Login failed';
        throw new Error(message);
      }
      throw error instanceof Error ? error : new Error('Login failed');
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    setupCode?: string,
  ): Promise<User> => {
    try {
      if (authEnabled === false) {
        throw new Error("Authentication is disabled");
      }
      const response = await authRegister(email, password, name, setupCode);
      const userData = response?.user;

      if (!isAuthUser(userData)) {
        throw new Error(
          "Registration succeeded but the server response was invalid. Check that the frontend and backend are running compatible versions.",
        );
      }

      writeStoredUser(userData);

      setAuthStatusError(null);
      setAuthEnabled(true);
      setUser(userData);
      return userData;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const message =
          typeof error.response?.data === 'object' &&
          error.response.data !== null &&
          'message' in error.response.data &&
          typeof error.response.data.message === 'string'
            ? error.response.data.message
            : 'Registration failed';
        throw new Error(message);
      }
      throw error instanceof Error ? error : new Error('Registration failed');
    }
  };

  const logout = () => {
    void authLogout().catch(() => undefined);
    clearStoredUser();
    setUser(null);
    setTimeout(() => {
      navigate('/login');
    }, 0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authEnabled,
        registrationEnabled,
        authStatusError,
        authMode,
        oidcEnabled,
        oidcEnforced,
        oidcProvider,
        bootstrapRequired,
        authOnboardingRequired,
        authOnboardingMode,
        login,
        register,
        logout,
        retryAuthStatus: loadUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
