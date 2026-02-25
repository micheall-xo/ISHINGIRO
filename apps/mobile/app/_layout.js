import { Stack, useRouter, useSegments } from 'expo-router';
import { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../services/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const AuthContext = createContext(null);

async function clearStoredSession() {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  await AsyncStorage.removeItem('sessionExpiresAt');
}

function parseTokenExpiry(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded =
      typeof atob === 'function'
        ? atob(normalized)
        : typeof Buffer !== 'undefined'
        ? Buffer.from(normalized, 'base64').toString('utf-8')
        : null;
    if (!decoded) return null;
    const payload = JSON.parse(decoded);
    return payload?.exp ? new Date(payload.exp * 1000).toISOString() : null;
  } catch (error) {
    return null;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const refreshProfile = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;
    try {
      const profile = await apiRequest('/auth/profile');
      const nextUser = {
        id: profile?.id,
        username: profile?.username,
        email: profile?.email,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        role: profile?.role,
        fullName: profile?.fullName,
        phoneNumber: profile?.phoneNumber,
        profilePicture: profile?.profilePicture || '',
      };
      setUser(nextUser);
      await AsyncStorage.setItem('user', JSON.stringify(nextUser));
      return profile;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        const storedExpiresAt = await AsyncStorage.getItem('sessionExpiresAt');

        if (storedToken && storedUser) {
          let nextUser = JSON.parse(storedUser);
          let nextExpiresAt = storedExpiresAt || parseTokenExpiry(storedToken);

          try {
            const validation = await apiRequest('/auth/session');
            nextUser = validation?.user || nextUser;
            nextExpiresAt = validation?.session?.expiresAt || nextExpiresAt;
          } catch (error) {
            // Keep cached session when server/db is temporarily unavailable.
          }

          setUser(nextUser);
          setSessionExpiresAt(nextExpiresAt);

          if (nextExpiresAt) {
            await AsyncStorage.setItem('sessionExpiresAt', nextExpiresAt);
          }
        } else {
          await clearStoredSession();
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        setUser(null);
        setSessionExpiresAt(null);
        await clearStoredSession();
      } finally {
        setIsSessionReady(true);
      }
    };

    bootstrapSession();
  }, []);

  useEffect(() => {
    if (!sessionExpiresAt) return undefined;

    const msUntilExpiry = new Date(sessionExpiresAt).getTime() - Date.now();
    if (msUntilExpiry <= 0) {
      const clearNow = async () => {
        setUser(null);
        setSessionExpiresAt(null);
        await clearStoredSession();
      };
      clearNow();
      return undefined;
    }

    const timer = setTimeout(async () => {
      setUser(null);
      setSessionExpiresAt(null);
      await clearStoredSession();
    }, msUntilExpiry);

    return () => clearTimeout(timer);
  }, [sessionExpiresAt]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = setInterval(() => {
      refreshProfile();
    }, 30000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!isSessionReady) return;
    const rootSegment = segments[0] || '';
    const isPublicRoute = ['', 'choose', 'login', 'register'].includes(rootSegment);

    if (!user && !isPublicRoute) {
      router.replace('/choose');
      return;
    }

    if (user && (rootSegment === '' || rootSegment === 'choose' || rootSegment === 'login' || rootSegment === 'register')) {
      const role = String(user.role || '').toLowerCase();
      const target =
        role === 'admin'
          ? '/admin'
          : role === 'teacher'
          ? '/teacher'
          : role === 'student'
          ? '/student'
          : '/guest';
      router.replace(target);
    }
  }, [isSessionReady, user, segments, router]);

  const auth = {
    user,
    sessionExpiresAt,
    isSessionReady,
    signIn: async (data) => {
      setUser(data);
      await AsyncStorage.setItem('user', JSON.stringify(data));
    },
    signOut: async () => {
      setUser(null);
      setSessionExpiresAt(null);
      try {
        await clearStoredSession();
      } catch (error) {
        // Force logout state even if storage cleanup fails transiently.
      }
    },
    setSession: async (token, data, session) => {
      if (token) {
        await AsyncStorage.setItem('token', token);
      }
      if (data) {
        await AsyncStorage.setItem('user', JSON.stringify(data));
        setUser(data);
      }
      if (session?.expiresAt) {
        await AsyncStorage.setItem('sessionExpiresAt', session.expiresAt);
        setSessionExpiresAt(session.expiresAt);
      } else {
        await AsyncStorage.removeItem('sessionExpiresAt');
        setSessionExpiresAt(null);
      }
    },
    refreshProfile,
  };

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={auth}>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
