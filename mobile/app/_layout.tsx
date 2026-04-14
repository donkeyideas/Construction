import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { registerForPushNotifications, addNotificationResponseListener } from '@/lib/notifications';
import { startSyncListener } from '@/lib/offline/sync-queue';

function AppInner() {
  const { mode } = useTheme();
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const syncCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Register push notifications when authenticated
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications().catch(() => {});
  }, [user]);

  // Listen for notification taps → navigate
  useEffect(() => {
    const cleanup = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen) {
        router.push(data.screen as any);
      }
    });
    return cleanup;
  }, [router]);

  // Start offline sync listener
  useEffect(() => {
    syncCleanup.current = startSyncListener((count) => {
      Alert.alert('Synced', `${count} offline action${count > 1 ? 's' : ''} synced successfully`);
    });
    return () => syncCleanup.current?.();
  }, []);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
