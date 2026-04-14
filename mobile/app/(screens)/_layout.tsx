import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';

export default function ScreensLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
