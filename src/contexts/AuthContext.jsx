import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Ao montar o app, tenta restaurar a sessão via refresh token (cookie HttpOnly).
  useEffect(() => {
    api
      .tryRestoreSession()
      .then((restored) => (restored ? api.me() : null))
      .then((u) => { if (u) setUser(u); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    api.setToken(data.access_token);
    const u = await api.me();
    setUser(u);
    return u;
  };

  const register = async (dados) => {
    const data = await api.register(dados);
    api.setToken(data.access_token);
    const u = await api.me();
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.me();
      setUser(u);
    } catch {
      // silently fail
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
