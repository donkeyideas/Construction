import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Building2, Clock, ClipboardList, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import OfflineBanner from '@/components/OfflineBanner';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1 }}>
    <OfflineBanner />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clock"
        options={{
          title: 'Clock',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily-log"
        options={{
          title: 'Daily Log',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} />,
        }}
      />
    </Tabs>
    </View>
  );
}
