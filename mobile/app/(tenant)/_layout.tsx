import { Tabs } from 'expo-router';
import { Home, Wrench, FileText, CreditCard } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';

export default function TenantTabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{ title: 'Maintenance', tabBarIcon: ({ color, size }) => <Wrench size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="lease"
        options={{ title: 'Lease', tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="payments"
        options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} /> }}
      />
    </Tabs>
  );
}
