import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin } from '../api/shopApi';

function loadAuth() {
  try {
    const raw = localStorage.getItem('__auth__');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveAuth(value) {
  try {
    if (!value) localStorage.removeItem('__auth__');
    else localStorage.setItem('__auth__', JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}

const AuthContext = createContext(null);

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides authentication state and actions. */
  const [auth, setAuth] = useState(() => loadAuth());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    saveAuth(auth);
  }, [auth]);

  const value = useMemo(() => {
    const user = auth?.user || null;
    const token = auth?.token || null;
    const isAuthenticated = Boolean(token && user);
    const isAdmin = user?.role === 'admin';

    return {
      user,
      token,
      isAuthenticated,
      isAdmin,
      loading,
      login: async ({ email, password }) => {
        setLoading(true);
        try {
          const res = await apiLogin({ email, password });
          setAuth(res);
          return res;
        } finally {
          setLoading(false);
        }
      },
      logout: () => setAuth(null),
    };
  }, [auth, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access auth state/actions. */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
