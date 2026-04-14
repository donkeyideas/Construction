import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '@/theme/ThemeContext';
import { getQueueCount } from '@/lib/offline/sync-queue';

export default function OfflineBanner() {
  const { colors } = useTheme();
  const [offline, setOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
      if (isOffline) {
        const count = await getQueueCount();
        setQueueCount(count);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!offline) return null;

  return (
    <View style={{
      backgroundColor: colors.amber,
      paddingVertical: 6,
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    }}>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
        You're offline
        {queueCount > 0 ? ` · ${queueCount} pending` : ''}
      </Text>
    </View>
  );
}
