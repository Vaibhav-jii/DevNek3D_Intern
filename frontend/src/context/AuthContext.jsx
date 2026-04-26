import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount (uses refresh cookie if access token missing)
  useEffect(() => {
    const init = async () => {
      const stored = sessionStorage.getItem('accessToken');
      if (!stored) {
        // Try silent refresh first
        try {
          const { data } = await api.post('/auth/refresh');
          sessionStorage.setItem('accessToken', data.data.accessToken);
        } catch {
          setLoading(false);
          return;
        }
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
      } catch {
        sessionStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    sessionStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    sessionStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
