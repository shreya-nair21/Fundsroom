import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isLoading: boolean;
  apiUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to restore session on mount
    const storedToken = localStorage.getItem('fundsroom_token');
    const storedUser = localStorage.getItem('fundsroom_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error restoring session:', e);
        localStorage.removeItem('fundsroom_token');
        localStorage.removeItem('fundsroom_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const { token: userToken, user: userData } = result.data;
        
        localStorage.setItem('fundsroom_token', userToken);
        localStorage.setItem('fundsroom_user', JSON.stringify(userData));
        
        setToken(userToken);
        setUser(userData);
        
        return { success: true, message: 'Login successful' };
      } else {
        return { success: false, message: result.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login request failed:', error);
      return { success: false, message: 'Could not connect to authentication server' };
    }
  };

  const logout = () => {
    localStorage.removeItem('fundsroom_token');
    localStorage.removeItem('fundsroom_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, apiUrl: API_URL }}>
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
