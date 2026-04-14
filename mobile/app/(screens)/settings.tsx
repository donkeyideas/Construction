import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sun,
  Moon,
  SwatchBook,
  Bell,
  Wifi,
  Lock,
  CircleHelp,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { registerForPushNotifications } from '@/lib/notifications';
import { getQueueCount, clearQueue } from '@/lib/offline/sync-queue';
import { clearAllCache } from '@/lib/offline/cache';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, radii, mode, variant, toggleMode, toggleVariant } = useTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    getQueueCount().then(setOfflineCount);
  }, []);

  async function handlePushToggle(enabled: boolean) {
    setPushEnabled(enabled);
    if (enabled) {
      const token = await registerForPushNotifications();
      if (!token) {
        Alert.alert('Permission Denied', 'Enable notifications in your device settings.');
        setPushEnabled(false);
      }
    }
  }

  async function handleClearOfflineData() {
    Alert.alert('Clear Offline Data', `This will remove ${offlineCount} pending actions and all cached data.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearQueue();
          await clearAllCache();
          setOfflineCount(0);
          Alert.alert('Cleared', 'Offline data has been cleared.');
        },
      },
    ]);
  }

  const sections = [
    {
      title: 'APPEARANCE',
      items: [
        {
          icon: mode === 'dark' ? Moon : Sun,
          label: 'Dark Mode',
          type: 'toggle' as const,
          value: mode === 'dark',
          onToggle: toggleMode,
        },
        {
          icon: SwatchBook,
          label: `Style: ${variant === 'classic' ? 'Classic' : 'Corporate'}`,
          type: 'press' as const,
          onPress: toggleVariant,
        },
      ],
    },
    {
      title: 'NOTIFICATIONS',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          type: 'toggle' as const,
          value: pushEnabled,
          onToggle: handlePushToggle,
        },
      ],
    },
    {
      title: 'DATA',
      items: [
        {
          icon: Wifi,
          label: `Offline Queue (${offlineCount} pending)`,
          type: 'press' as const,
          onPress: offlineCount > 0 ? handleClearOfflineData : () => Alert.alert('Offline Queue', 'No pending actions. When offline, your changes are queued and synced automatically when you reconnect.'),
        },
        {
          icon: Trash2,
          label: 'Clear Cache',
          type: 'press' as const,
          onPress: async () => {
            await clearAllCache();
            Alert.alert('Done', 'Cache cleared.');
          },
        },
      ],
    },
    {
      title: 'ABOUT',
      items: [
        {
          icon: Lock,
          label: 'Privacy Policy',
          type: 'press' as const,
          onPress: () => Linking.openURL('https://construction-gamma-six.vercel.app/p/privacy'),
        },
        {
          icon: CircleHelp,
          label: 'Terms of Service',
          type: 'press' as const,
          onPress: () => Linking.openURL('https://construction-gamma-six.vercel.app/p/terms'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Settings</Text>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 20 }}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }}>
              {section.title}
            </Text>
            <View style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={item.type === 'press' ? item.onPress : undefined}
                  disabled={item.type === 'toggle'}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <item.icon size={18} color={colors.muted} />
                    <Text style={{ fontSize: 14, color: colors.text }}>{item.label}</Text>
                  </View>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: colors.border, true: colors.blue }}
                    />
                  ) : (
                    <ChevronRight size={16} color={colors.muted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={{ textAlign: 'center', fontSize: 12, color: colors.muted, marginTop: 8 }}>
          Buildwrk v{appVersion}
        </Text>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
