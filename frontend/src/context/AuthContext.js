import { createContext, useState, useEffect, useRef } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { authAPI, getAuthHeaders } from "../services/api";

export const AuthContext = createContext();

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshingSession = useRef(false);
  
  // Clerk hooks
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();
  const { getToken, signOut } = useClerkAuth();

  // Sync Clerk user with backend
  useEffect(() => {
    const syncClerkUser = async () => {
      if (!isLoaded) return;

      console.log("[AUTH] Clerk loaded:", { isSignedIn, clerkUser: !!clerkUser });

      if (isSignedIn && clerkUser) {
        try {
          // Get Clerk JWT token
          const clerkToken = await getToken();
          console.log("[AUTH] Got Clerk token");

          // Send to backend to create/sync user
          const response = await authAPI.clerkSync(
            clerkToken,
            clerkUser.primaryEmailAddress?.emailAddress,
            clerkUser.fullName || clerkUser.firstName || "User",
            clerkUser.id
          );

          console.log("[AUTH] Clerk sync response:", response);

          const { token, user: userData, tab_session_key } = response;

          // Store our app's JWT token
          localStorage.setItem("token", token);
          localStorage.setItem("user_id", userData.id || userData._id);

          if (tab_session_key) {
            sessionStorage.setItem("tab_session_key", tab_session_key);
          }

          setUser(userData);
          setLoading(false);
        } catch (error) {
          console.error("[AUTH] Clerk sync failed:", error);
          setLoading(false);
        }
      } else {
        // Not signed in with Clerk, check for traditional auth
        checkTraditionalAuth();
      }
    };

    syncClerkUser();
  }, [isSignedIn, clerkUser, isLoaded, getToken]);

  // Check traditional email/password authentication
  const checkTraditionalAuth = async () => {
    const token = localStorage.getItem("token");
    console.log("[AUTH] Checking traditional auth, token exists:", !!token);

    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const tokenUserId = tokenPayload.user_id;
        const storedUserId = localStorage.getItem("user_id");

        if (storedUserId && tokenUserId !== storedUserId) {
          console.error("🚨 SECURITY ALERT: TOKEN MISMATCH!");
          localStorage.clear();
          setUser(null);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("[AUTH] Error parsing token:", error);
        localStorage.clear();
        setUser(null);
        setLoading(false);
        return;
      }

      const tabSessionKey = sessionStorage.getItem("tab_session_key");

      if (!tabSessionKey) {
        console.warn("[AUTH] No tab session key found - creating new tab session");

        if (refreshingSession.current) {
          console.log("[AUTH] Refresh already in progress");
          return;
        }

        refreshingSession.current = true;

        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/refresh-session`, {
            method: "POST",
            headers: getAuthHeaders(),
          });
          const data = await response.json();
          
          console.log("[AUTH] New tab session created:", data);
          const newTabKey = data.tab_session_key;
          if (newTabKey) {
            sessionStorage.setItem("tab_session_key", newTabKey);
          }

          const userData = await authAPI.getProfile();
          if (userData.id && !userData._id) {
            userData._id = userData.id;
          }
          setUser(userData);
          localStorage.setItem("user_id", userData.id || userData._id);
        } catch (error) {
          console.error("[AUTH] Session creation failed:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user_id");
          setUser(null);
        } finally {
          refreshingSession.current = false;
          setLoading(false);
        }
        return;
      }

      // Validate token with existing tab session
      try {
        const userData = await authAPI.getProfile();
        if (userData.id && !userData._id) {
          userData._id = userData.id;
        }
        setUser(userData);
        localStorage.setItem("user_id", userData.id || userData._id);
        setLoading(false);
      } catch (error) {
        console.error("[AUTH] Token validation failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user_id");
        setUser(null);
        setLoading(false);
      }
    } else {
      console.log("[AUTH] No token found");
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    const { token, user, tab_session_key } = data;

    localStorage.setItem("token", token);
    localStorage.setItem("user_id", user.id || user._id);

    if (tab_session_key) {
      sessionStorage.setItem("tab_session_key", tab_session_key);
    }

    setUser(user);
    return user;
  };

  const register = async (name, email, password) => {
    await authAPI.register(name, email, password);
    return await login(email, password);
  };

  const logout = async () => {
    // Logout from Clerk if signed in
    if (isSignedIn) {
      await signOut();
    }

    // Logout from our backend
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    sessionStorage.removeItem("tab_session_key");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};