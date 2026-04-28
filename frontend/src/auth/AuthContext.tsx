import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiGet, apiPost, saveToken, clearToken, getToken } from '../api/client';
import type { User, AuthState } from '../types';

// ── Tipi del context ──────────────────────────────────────────
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    bodyWeightKg?: number,
  ) => Promise<void>;
  logout: () => void;
  // Ricarica i dati utente dal backend (es. dopo PATCH /user/profile in Settings)
  refreshUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // true fino al check iniziale del token
  });

  // Al mount: se esiste un token in localStorage, verifica che sia ancora valido
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    apiGet<{ user: User }>('/user/profile')
      .then(({ user }) => {
        setState({ user, token, isAuthenticated: true, isLoading: false });
      })
      .catch(() => {
        // Token scaduto o non valido — pulisci e vai al login
        clearToken();
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  // ── login ────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const { token, user } = await apiPost<{ token: string; user: User }>(
      '/auth/login',
      { email, password },
    );
    saveToken(token);
    setState({ user, token, isAuthenticated: true, isLoading: false });
  };

  // ── register ─────────────────────────────────────────────────
  const register = async (
    username: string,
    email: string,
    password: string,
    bodyWeightKg?: number,
  ) => {
    const { token, user } = await apiPost<{ token: string; user: User }>(
      '/auth/register',
      { username, email, password, ...(bodyWeightKg ? { bodyWeightKg } : {}) },
    );
    saveToken(token);
    setState({ user, token, isAuthenticated: true, isLoading: false });
  };

  // ── logout ───────────────────────────────────────────────────
  const logout = () => {
    clearToken();
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  };

  // ── refreshUser ──────────────────────────────────────────────
  const refreshUser = async () => {
    const { user } = await apiGet<{ user: User }>('/user/profile');
    setState((s) => ({ ...s, user }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
}
