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
  // For deployed frontends prefer relative API path so same origin will be used.
  // If REACT_APP_API_BASE_URL is set, use it; otherwise use a relative path for production builds.
  const envBase = process.env.REACT_APP_API_BASE_URL || (typeof window !== 'undefined' && !['localhost','127.0.0.1','::1'].includes(window.location.hostname) ? '/api/backend' : 'http://localhost:5000');
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const host = window.location.hostname;
      const isLocalHostOrigin = host === 'localhost' || host === '127.0.0.1' || host === '::1';
      const envIsLocal = envBase.startsWith('http://localhost') || envBase.startsWith('http://127.0.0.1');
      if (!isLocalHostOrigin && envIsLocal) {
        // Frontend is served from a public host but API base points to localhost.
        // Instead of blocking, fall back to the serverless backend path and warn.
        console.warn('REACT_APP_API_BASE_URL points to localhost but the app is running from a non-localhost origin. Falling back to /api/backend. Update REACT_APP_API_BASE_URL in your hosting provider to your backend URL.');
        return '/api/backend';
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
