import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, normalizeServerUrl } from '../lib/api';
import { saveForms } from '../lib/db';
import { startAutoSync, stopAutoSync } from '../lib/sync';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  serverUrl: string;
  isLoading: boolean;
  login: (serverUrl: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  setServerUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrlState] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved auth on mount
  useEffect(() => {
    (async () => {
      try {
        const savedUrl = await SecureStore.getItemAsync('server_url');
        const savedToken = await SecureStore.getItemAsync('auth_token');
        const savedUser = await SecureStore.getItemAsync('auth_user');

        if (savedUrl) setServerUrlState(normalizeServerUrl(savedUrl));

        if (savedToken && savedUser) {
          const normalizedSavedUrl = normalizeServerUrl(savedUrl || '');
          setToken(savedToken);

          try {
            const currentUser = await api.auth.me(normalizedSavedUrl, savedToken);
            setUser(currentUser);
            await SecureStore.setItemAsync('auth_user', JSON.stringify(currentUser));
            if (normalizedSavedUrl) {
              startAutoSync(normalizedSavedUrl, savedToken);
            }
          } catch {
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('auth_user');
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        // Ignore errors, start fresh
      } finally {
        setIsLoading(false);
      }
    })();

    return () => stopAutoSync();
  }, []);

  const login = useCallback(async (url: string, username: string, password: string) => {
    const normalizedUrl = normalizeServerUrl(url);

    // Ping server first
    const reachable = await api.health.ping(normalizedUrl);
    if (!reachable) {
      throw new Error('Cannot reach server. Check the address and make sure you are on the same WiFi.');
    }

    const result = await api.auth.login(normalizedUrl, username, password);

    await SecureStore.setItemAsync('server_url', normalizedUrl);
    await SecureStore.setItemAsync('auth_token', result.token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(result.user));

    setServerUrlState(normalizedUrl);
    setToken(result.token);
    setUser(result.user);

    // Download forms from server
    try {
      const forms = await api.forms.list(normalizedUrl, result.token);
      await saveForms(forms);
    } catch {
      // Forms will sync later
    }

    startAutoSync(normalizedUrl, result.token);
  }, []);

  const logout = useCallback(() => {
    stopAutoSync();
    SecureStore.deleteItemAsync('auth_token');
    SecureStore.deleteItemAsync('auth_user');
    SecureStore.deleteItemAsync('server_url');
    setToken(null);
    setUser(null);
    setServerUrlState('');
  }, []);

  const setServerUrl = useCallback(async (url: string) => {
    const normalizedUrl = normalizeServerUrl(url);
    await SecureStore.setItemAsync('server_url', normalizedUrl);
    setServerUrlState(normalizedUrl);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, serverUrl, isLoading, login, logout, setServerUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
