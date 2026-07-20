import { createContext, useContext, useState, useCallback } from 'react';
import { login as loginApi } from '../api/authApi';

const AuthContext = createContext(null);

const TOKEN_KEY = 'qagenie_token';
const USER_KEY = 'qagenie_user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginApi(username, password);
      const sessionUser = { username: result.username, role: result.role, token: result.token };
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      return sessionUser;
    } catch (err) {
      // Backend unreachable (network error, no HTTP response at all) - fall
      // back to the dummy admin/test credential so the FE remains usable
      // on its own while FE/BE are developed independently. Any real HTTP
      // error response (401/422 from a running backend) is NOT swallowed.
      const noResponse = !err.response;
      if (noResponse && username === 'admin' && password === 'test') {
        const sessionUser = { username: 'admin', role: 'ADMIN', token: 'dummy-offline-token' };
        localStorage.setItem(TOKEN_KEY, sessionUser.token);
        localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
        setUser(sessionUser);
        return sessionUser;
      }
      const message = err.response?.data?.message || 'Invalid username or password';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
