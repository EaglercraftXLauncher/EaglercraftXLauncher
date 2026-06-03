import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'github';
  joinedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (provider: 'google' | 'github') => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for token in sessionStorage (set by AuthCallback)
    const storedToken = sessionStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      refresh();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refresh = async () => {
    try {
      const authToken = sessionStorage.getItem('auth_token');
      if (!authToken) {
        setUser(null);
        setToken(null);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const userData = await response.json() as User;
        setUser(userData);
        setToken(authToken);
      } else {
        sessionStorage.removeItem('auth_token');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (provider: 'google' | 'github') => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    if (provider === 'google') {
      window.location.href = `${import.meta.env.VITE_API_URL}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
    } else {
      window.location.href = `${import.meta.env.VITE_API_URL}/auth/github?redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('auth_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!user, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};