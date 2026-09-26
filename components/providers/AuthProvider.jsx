'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../lib/api';

const AuthContext = createContext(null);

function safeMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err.message === 'string' && err.message.trim()) return err.message;
  return fallback;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getSession();
      const nextUser = data && data.user ? data.user : null;
      if (!mountedRef.current) return nextUser;
      setUser(nextUser);
      setStatus(nextUser ? 'authenticated' : 'anonymous');
      setError(null);
      return nextUser;
    } catch (err) {
      // Network failure or API down — degrade gracefully to anonymous.
      if (!mountedRef.current) return null;
      setUser(null);
      setStatus('anonymous');
      setError(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await api.login({ email, password });
      const nextUser = data && data.user ? data.user : null;
      if (mountedRef.current) {
        setUser(nextUser);
        setStatus(nextUser ? 'authenticated' : 'anonymous');
      }
      if (!nextUser) {
        const message = 'Sign in failed. Please try again.';
        if (mountedRef.current) setError(message);
        return { ok: false, error: message };
      }
      return { ok: true, user: nextUser };
    } catch (err) {
      const message = safeMessage(err, 'We could not sign you in. Check your details and try again.');
      if (mountedRef.current) setError(message);
      return { ok: false, error: message };
    }
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setError(null);
    try {
      const data = await api.signup({ name, email, password });
      const nextUser = data && data.user ? data.user : null;
      if (mountedRef.current) {
        setUser(nextUser);
        setStatus(nextUser ? 'authenticated' : 'anonymous');
      }
      if (!nextUser) {
        const message = 'Account created, but the session could not start. Please sign in.';
        if (mountedRef.current) setError(message);
        return { ok: false, error: message };
      }
      return { ok: true, user: nextUser };
    } catch (err) {
      const message = safeMessage(err, 'We could not create your account. Please try again.');
      if (mountedRef.current) setError(message);
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      // Even if the API is unreachable, clear local state so the UI stays usable.
    }
    if (mountedRef.current) {
      setUser(null);
      setStatus('anonymous');
      setError(null);
    }
    return { ok: true };
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated' && Boolean(user),
      login,
      signup,
      logout,
      refresh,
      clearError: () => setError(null),
    }),
    [user, status, error, login, signup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return context;
}

export default AuthProvider;