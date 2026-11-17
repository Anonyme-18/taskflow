'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { api, removeToken, setToken } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const currentUser = await api.auth.getMe();
      setUser(currentUser);
      localStorage.setItem('taskflow_user', JSON.stringify(currentUser));
    } catch {
      setUser(null);
      removeToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('taskflow_token');
    const savedUser = localStorage.getItem('taskflow_user');

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        queueMicrotask(() => {
          if (isMounted) setUser(parsed);
        });
      } catch {
        // Ignorer l'erreur de parsing
      }
    }

    if (token) {
      api.auth
        .getMe()
        .then((currentUser) => {
          if (isMounted) {
            setUser(currentUser);
            localStorage.setItem('taskflow_user', JSON.stringify(currentUser));
          }
        })
        .catch(() => {
          if (isMounted) {
            setUser(null);
            removeToken();
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      queueMicrotask(() => {
        if (isMounted) setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.auth.login({ email, password });
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('taskflow_user', JSON.stringify(response.user));
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.auth.register({
        full_name: fullName,
        email,
        password,
      });
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('taskflow_user', JSON.stringify(response.user));
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}
