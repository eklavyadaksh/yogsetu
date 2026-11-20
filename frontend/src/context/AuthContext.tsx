import React, { createContext, useContext, useState, useEffect } from 'react';
import { normalizeIdentifier } from '../lib/identity';

export interface AuthUser {
  identifier: string;
  name: string;
  role: 'user' | 'doctor';
  id_type: 'email' | 'phone';
}

interface AuthContextType {
  user: AuthUser | null;
  login: (data: { identifier: string; name?: string; role: 'user' | 'doctor' }) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('yogsetu_auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('yogsetu_auth', JSON.stringify(user));
    } else {
      localStorage.removeItem('yogsetu_auth');
    }
  }, [user]);

  const login = (data: { identifier: string; name?: string; role: 'user' | 'doctor' }) => {
    const { canonical, type } = normalizeIdentifier(data.identifier);
    const defaultName = data.role === 'doctor' ? `Dr. ${canonical.split('@')[0]}` : canonical.split('@')[0];
    const authData: AuthUser = {
      identifier: canonical,
      name: data.name?.trim() || defaultName,
      role: data.role,
      id_type: type,
    };
    setUser(authData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
