import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "./api";
import { decodeJwt, isExpired } from "./jwt";


const AuthContext = createContext(null);

function readUser() {
  const access = tokenStore.access;
  if (!access || isExpired(access)) return null;
  const claims = decodeJwt(access);
  if (!claims) return null;
  return {
    id: claims.user_id,
    username: localStorage.getItem("nexusdrop.username") || `user#${claims.user_id}`,
    isStaff: !!claims.is_staff,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const signOut = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem("nexusdrop.username");
    setUser(null);
  }, []);

  const signIn = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/token/", { username, password });
    tokenStore.set({ access: data.access, refresh: data.refresh });
    localStorage.setItem("nexusdrop.username", username);
    setUser(readUser());
    return data;
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("nexusdrop:signed-out", handler);
    return () => window.removeEventListener("nexusdrop:signed-out", handler);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      signIn,
      signOut,
      isMockApi: false,
    }),
    [user, signIn, signOut]
  );


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
