import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeContext';

const ONBOARDING_KEY = '@buildwrk:onboarding-complete';

export default function Index() {
  const router = useRouter();
  const { initialized, user } = useAuthStore();
  const { colors } = useTheme();
  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  // Check onboarding status once
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboarded(val === 'true');
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!initialized || !checked) return;
    if (user) {
      router.replace('/(tabs)');
    } else if (!onboarded) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(auth)/login');
    }
  }, [initialized, user, checked, onboarded, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );
}
