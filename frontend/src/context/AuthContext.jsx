import React, { createContext, useState, useEffect } from "react";
import { registerUser, fetchUser, loginUser, logoutUser, googleAuth } from "../api/authApi";
import { GoogleOAuthProvider } from "@react-oauth/google";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // optional but useful for conditional UI

  // ✅ Fetch user on mount to persist session
  useEffect(() => {
    const getUser = async () => {
      try {
        const userData = await fetchUser();
        setUser(userData);
      } catch (error) {
        setUser(null);
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  // ✅ Register handler
  const register = async (userData) => {
    try {
      const response = await registerUser(userData);
      setUser(response);
      return response;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  };

  // ✅ Login handler
  const login = async (credentials) => {
    try {
      const response = await loginUser(credentials);
      setUser(response);
      return response;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  };

  // ✅ Logout handler
  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      return { message: "Logged out successfully" };
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  };

  const responseGoogle = async(authResult) => {
      try {
        console.log("Google Auth Result:", authResult);
        if(authResult?.code) {
          const response = await googleAuth(authResult.code);
          setUser(response);
          return response;
        }
      }catch (error) {
        console.error("Google login failed:", error);
        throw error;
      }
    }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
    <AuthContext.Provider value={{ user, register, login, logout, loading,setUser,responseGoogle }}>
      {children}
    </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};

export default AuthContext;
