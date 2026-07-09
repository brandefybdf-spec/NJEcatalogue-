import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { apiErrorMessage } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = anon, obj = authed
  const [error, setError] = useState("");

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("nje_token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (e) {
      localStorage.removeItem("nje_token");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("nje_token", data.token);
      setUser(data.user);
      return true;
    } catch (e) {
      setError(apiErrorMessage(e, "Login failed"));
      return false;
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) { /* ignore */ }
    localStorage.removeItem("nje_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, error, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
