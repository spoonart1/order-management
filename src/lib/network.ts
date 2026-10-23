import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Memeriksa status konektivitas internet saat ini
 */
export async function checkIsOnline(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
  }

  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && (state.isInternetReachable ?? true));
  } catch (e) {
    console.warn('[network] NetInfo fetch error:', e);
    return true; // Default fallback anggap terhubung jika check gagal
  }
}

/**
 * Custom hook untuk memantau status online/offline secara reaktif di komponen React
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
} {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // 1. Web event listeners untuk browser (instant feedback)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      setIsOnline(navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // 2. NetInfo listener untuk Mobile (iOS / Android) dan Expo
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = Boolean(state.isConnected);
      const reachable = state.isInternetReachable ?? connected;

      setIsOnline(connected && reachable);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOnline, isInternetReachable, connectionType };
}
