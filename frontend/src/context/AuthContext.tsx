import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  companyName: string;
}

export interface LicenseStatus {
  licenseExpiresAt: string;
  isExpired: boolean;
  daysRemaining: number;
  lastPaymentLinkUrl?: string;
  lastPaymentLinkId?: string;
  companyName: string;
  subscriptionPrice?: number;
  subscriptionDays?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  license: LicenseStatus | null;
  checkLicense: (currentToken?: string | null) => Promise<void>;
  loadingLicense: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loadingLicense, setLoadingLicense] = useState(false);
  const navigate = useNavigate();

  const checkLicense = async (currentToken?: string | null) => {
    const activeToken = currentToken !== undefined ? currentToken : token;
    if (!activeToken) {
      setLicense(null);
      return;
    }
    setLoadingLicense(true);
    try {
      const res = await fetch('http://localhost:3002/api/licensing/status', {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLicense(data);
      } else {
        console.error('Failed to fetch license status');
      }
    } catch (err) {
      console.error('Error checking license status:', err);
    } finally {
      setLoadingLicense(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      const parsedToken = savedToken;
      setToken(parsedToken);
      setUser(JSON.parse(savedUser));
      checkLicense(parsedToken);
    }
    setLoading(false);
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    await checkLicense(newToken);
    navigate('/');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setLicense(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>Carregando...</div>;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isAuthenticated: !!token, 
      license, 
      checkLicense, 
      loadingLicense 
    }}>
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
