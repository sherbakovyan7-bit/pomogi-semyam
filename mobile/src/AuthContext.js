import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken } from './api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ps_token';
const USER_KEY = 'ps_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (token) {
          setToken(token);
          try {
            const { user: me } = await api.me();
            if (me) {
              setUser(me);
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
              return;
            }
          } catch {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
          }
        }
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await api.login(email, password);
    setToken(token);
    setUser(u);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(u)],
    ]);
  }, []);

  const register = useCallback(async (data) => {
    const { token, user: u } = await api.register(data);
    setToken(token);
    setUser(u);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(u)],
    ]);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}