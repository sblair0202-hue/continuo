import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { API_BASE_URL, setAuthToken } from '../api/client';

// expo-secure-store doesn't support web — fall back to localStorage
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};

const TOKEN_KEY = 'continuo_auth_v1';
const USER_KEY = 'continuo_user_v1';

export interface AuthUser {
  user_id: string;
  display_name: string;
  role: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  needsBiometricUnlock: boolean;
  biometricAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  skipBiometric: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [needsBiometricUnlock, setNeedsBiometricUnlock] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    async function init() {
      // Check biometric hardware
      const hasBio = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = hasBio
        ? await LocalAuthentication.isEnrolledAsync().catch(() => false)
        : false;
      setBiometricAvailable(hasBio && enrolled);

      // Load stored session
      try {
        const storedToken = await storage.get(TOKEN_KEY);
        const storedUser = await storage.get(USER_KEY);
        if (storedToken && storedUser) {
          tokenRef.current = storedToken;
          setAuthToken(storedToken);
          setUser(JSON.parse(storedUser));
          if (hasBio && enrolled) {
            setNeedsBiometricUnlock(true);
          }
        }
      } catch {
        // Corrupted storage — user will need to sign in
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Sign in failed. Check your email and password.');
    }
    const data: { access_token: string; user_id: string; display_name: string; role: string } =
      await res.json();

    const newUser: AuthUser = {
      user_id: data.user_id,
      display_name: data.display_name,
      role: data.role,
    };
    await storage.set(TOKEN_KEY, data.access_token);
    await storage.set(USER_KEY, JSON.stringify(newUser));
    tokenRef.current = data.access_token;
    setAuthToken(data.access_token);
    setNeedsBiometricUnlock(false);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (tokenRef.current) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });
      }
    } catch {}
    await storage.remove(TOKEN_KEY).catch(() => {});
    await storage.remove(USER_KEY).catch(() => {});
    tokenRef.current = null;
    setAuthToken(null);
    setNeedsBiometricUnlock(false);
    setUser(null);
  }, []);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Continuo',
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      setNeedsBiometricUnlock(false);
    }
    return result.success;
  }, []);

  const skipBiometric = useCallback(() => {
    setNeedsBiometricUnlock(false);
    setUser(null); // Force sign-in screen
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        needsBiometricUnlock,
        biometricAvailable,
        login,
        logout,
        unlockWithBiometric,
        skipBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
