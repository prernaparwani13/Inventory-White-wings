'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/api';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load initial theme from localStorage
    const savedTheme = localStorage.getItem('ww_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const checkLoggedIn = async () => {
      const token = sessionStorage.getItem('ww_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      try {
        const res = await api.get('/auth/profile');
        if (res.success) {
          setUser(res.data);
        } else {
          sessionStorage.removeItem('ww_token');
          setUser(null);
          router.push('/login');
        }
      } catch (err) {
        console.error('Failed to authenticate token:', err.message);
        sessionStorage.removeItem('ww_token');
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, [pathname, router]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.success) {
        sessionStorage.setItem('ww_token', res.data.token);
        setUser(res.data);
        router.push('/dashboard');
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Invalid email or password' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('ww_token');
    setUser(null);
    router.push('/login');
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('ww_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, theme, toggleTheme, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
