import { Tabs } from 'expo-router';
import { Home, FileText, CreditCard, User } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';

export default function VendorTabLayout() {
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
        name="invoices"
        options={{ title: 'Invoices', tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="payments"
        options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} /> }}
      />
    </Tabs>
  );
}
