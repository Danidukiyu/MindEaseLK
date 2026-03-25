import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { Platform } from "react-native";

interface AuthContextType {
  user: any;
  token: string | null;
  login: (userData: any, token: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "index" || segments[0] === "register";

    if (!token && !inAuthGroup) {
      router.replace("/");
    } else if (token && inAuthGroup) {
      router.replace("/home");
    }
  }, [token, segments, isLoading]);

  const loadToken = async () => {
    try {
      // SecureStore is not available on Web
      if (Platform.OS === 'web') {
        const storedToken = localStorage.getItem("userToken");
        const storedUser = localStorage.getItem("userData");
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
        return;
      }

      const storedToken = await SecureStore.getItemAsync("userToken");
      const storedUser = await SecureStore.getItemAsync("userData");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to load token", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: any, userToken: string, rememberMe: boolean) => {
    setUser(userData);
    setToken(userToken);
    if (rememberMe) {
      if (Platform.OS === 'web') {
        localStorage.setItem("userToken", userToken);
        localStorage.setItem("userData", JSON.stringify(userData));
      } else {
        await SecureStore.setItemAsync("userToken", userToken);
        await SecureStore.setItemAsync("userData", JSON.stringify(userData));
      }
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    if (Platform.OS === 'web') {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userData");
    } else {
      await SecureStore.deleteItemAsync("userToken");
      await SecureStore.deleteItemAsync("userData");
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};