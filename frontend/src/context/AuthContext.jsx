import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("medguard_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("medguard_token"));
  const [loading, setLoading] = useState(false);

  // For caregivers: which patient they're currently viewing.
  const [activePatient, setActivePatient] = useState(() => {
    const raw = localStorage.getItem("medguard_active_patient");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem("medguard_token", token);
    else localStorage.removeItem("medguard_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("medguard_user", JSON.stringify(user));
    else localStorage.removeItem("medguard_user");
  }, [user]);

  useEffect(() => {
    if (activePatient) localStorage.setItem("medguard_active_patient", JSON.stringify(activePatient));
    else localStorage.removeItem("medguard_active_patient");
  }, [activePatient]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setToken(data.token);
      setUser(data.user);
      if (data.user.role === "patient") setActivePatient(null);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", payload);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setActivePatient(null);
  }, []);

  // For a "patient" user, the patientId they act on is always themselves.
  // For a "caregiver" user, it's whichever patient they've switched to.
  const patientId = user?.role === "patient" ? user.id : activePatient?.id || null;

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout,
      activePatient, setActivePatient, patientId
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
