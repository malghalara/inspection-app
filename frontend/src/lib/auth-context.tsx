"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { refreshAccessToken, logoutUser, setAccessToken as syncAccessToken } from "@/lib/api";

interface AuthContextValue {
  accessToken: string | null;
  role: string | null;
  isInitialized: boolean;
  setSession: (accessToken: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeJwtPayload(token: string): { exp?: number; role?: string } | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// NOTE: localStorage is a temporary dev convenience. Before production, the
// refresh token should be set as an httpOnly cookie by the backend instead
// of being readable by frontend JS. See PROJECT_HANDOFF.md section 9.2.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback(() => {
    setAccessTokenState(null);
    setRole(null);
    syncAccessToken(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  const scheduleRefresh = useCallback(
    (token: string) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);

      const payload = decodeJwtPayload(token);
      if (!payload?.exp) return;

      const msUntilExpiry = payload.exp * 1000 - Date.now();
      const delay = Math.max(msUntilExpiry - 60_000, 5_000);

      refreshTimer.current = setTimeout(async () => {
        const storedRefreshToken = localStorage.getItem("refresh_token");
        if (!storedRefreshToken) {
          clearSession();
          return;
        }
        try {
          const result = await refreshAccessToken(storedRefreshToken);
          setAccessTokenState(result.access_token);
          syncAccessToken(result.access_token);
          localStorage.setItem("access_token", result.access_token);
          const newPayload = decodeJwtPayload(result.access_token);
          setRole(newPayload?.role ?? null);
          scheduleRefresh(result.access_token);
        } catch {
          clearSession();
        }
      }, delay);
    },
    [clearSession]
  );

  useEffect(() => {
    const stored = localStorage.getItem("access_token");
    if (stored) {
      setAccessTokenState(stored);
      syncAccessToken(stored);
      const payload = decodeJwtPayload(stored);
      setRole(payload?.role ?? null);
      scheduleRefresh(stored);
    }
    setIsInitialized(true);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSession(newAccessToken: string, newRefreshToken?: string) {
    setAccessTokenState(newAccessToken);
    syncAccessToken(newAccessToken);
    localStorage.setItem("access_token", newAccessToken);
    if (newRefreshToken) localStorage.setItem("refresh_token", newRefreshToken);
    const payload = decodeJwtPayload(newAccessToken);
    setRole(payload?.role ?? null);
    scheduleRefresh(newAccessToken);
  }

  async function logout() {
    const storedRefreshToken = localStorage.getItem("refresh_token");
    if (storedRefreshToken) {
      try {
        await logoutUser(storedRefreshToken);
      } catch {
        // Ignore — clear local session regardless
      }
    }
    clearSession();
  }

  return (
    <AuthContext.Provider value={{ accessToken, role, isInitialized, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}