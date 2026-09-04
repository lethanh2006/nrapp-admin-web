"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/session-user";

type Status = "loading" | "authenticated" | "unauthenticated" | "error";
type Value = { user: SessionUser | null; status: Status; error: string; refreshSession: () => Promise<SessionUser | null>; setAuthenticatedUser: (user: SessionUser) => void; logout: () => Promise<void> };
const Context = createContext<Value | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const bootstrapped = useRef(false);
  const refreshSession = useCallback(async () => {
    setStatus("loading"); setError("");
    try { const result = await apiRequest<{ user: SessionUser }>("/api/auth/session"); setUser(result.user); setStatus("authenticated"); return result.user; }
    catch (requestError) { if (requestError instanceof ApiClientError && [401, 403].includes(requestError.status)) { setUser(null); setStatus("unauthenticated"); return null; } setUser(null); setStatus("error"); setError(requestError instanceof Error ? requestError.message : "Không thể kiểm tra phiên."); return null; }
  }, []);
  useEffect(() => { if (bootstrapped.current) return; bootstrapped.current = true; void refreshSession(); }, [refreshSession]);
  const setAuthenticatedUser = useCallback((value: SessionUser) => { setUser(value); setError(""); setStatus("authenticated"); }, []);
  const logout = useCallback(async () => { try { await apiRequest("/api/auth/logout", { method: "POST" }); } finally { setUser(null); setError(""); setStatus("unauthenticated"); } }, []);
  return <Context.Provider value={{ user, status, error, refreshSession, setAuthenticatedUser, logout }}>{children}</Context.Provider>;
}
export function useAuthSession() { const value = useContext(Context); if (!value) throw new Error("Thiếu AuthSessionProvider."); return value; }
