import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Check } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { apiCall } from '@/lib/supabase';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await apiCall<any[]>('/api/inbox/notifications');
    setNotifications(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  async function markRead(id: string) {
    await apiCall('/api/inbox/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Notifications</Text>
        <Bell size={20} color={colors.muted} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {notifications.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No notifications</Text>
        ) : (
          notifications.map((n: any) => (
            <TouchableOpacity
              key={n.id}
              onPress={() => markRead(n.id)}
              style={{
                backgroundColor: n.read ? colors.cardBg : colors.blueLight,
                borderRadius: radii.md,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.read ? 'transparent' : colors.blue, marginTop: 5 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: n.read ? '400' : '600', color: colors.text }}>
                  {n.title ?? n.message ?? 'Notification'}
                </Text>
                {n.body && (
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={2}>
                    {n.body}
                  </Text>
                )}
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                  {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                </Text>
              </View>
              {!n.read && <Check size={16} color={colors.blue} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
