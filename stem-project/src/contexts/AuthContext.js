import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Helper to decode JWT (basic decoding without verification)
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if token exists on mount
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, []);

  // Build API base url safely. If the app is running from a non-localhost origin (deployed),
  // require REACT_APP_API_BASE_URL to be set to avoid calling user's localhost from the browser.
  function getApiBase() {
    const envBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const host = window.location.hostname;
      const isLocalHostOrigin = host === 'localhost' || host === '127.0.0.1' || host === '::1';
      const envIsLocal = envBase.startsWith('http://localhost') || envBase.startsWith('http://127.0.0.1');
      if (!isLocalHostOrigin && envIsLocal) {
        // Frontend is served from a public host but API base points to localhost.
        // This would cause the browser to attempt connecting to the user's machine and fail (or be a security/privacy issue).
        console.error('REACT_APP_API_BASE_URL is not set for a deployed frontend. Set REACT_APP_API_BASE_URL in your hosting provider to your backend URL.');
        return null;
      }
    }
    return envBase;
  }

  const verifyToken = async () => {
    try {
      const decoded = decodeToken(token);
      const API_BASE = getApiBase();
      if (!API_BASE) throw new Error('API base not configured for this environment');
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('auth_token');
        setToken(null);
      }
    } catch (err) {
      console.error('Token verification failed:', err);
    }
  };

  const signup = async (email, username, password, confirmPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      const API_BASE = getApiBase();
      if (!API_BASE) throw new Error('API base not configured for this environment');
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, confirmPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Signup failed');
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('auth_token', data.token);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signin = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const API_BASE = getApiBase();
      if (!API_BASE) throw new Error('API base not configured for this environment');
      const response = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Signin failed');
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('auth_token', data.token);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
  };

  const value = {
    user,
    token,
    isLoading,
    error,
    signup,
    signin,
    logout,
    isAuthenticated: !!user && !!token,
    getUserId: () => user?.id || 'anonymous'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
