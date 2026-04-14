import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, ClipboardList, ShieldCheck, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme/ThemeContext';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = '@buildwrk:onboarding-complete';

const slides = [
  {
    icon: Clock,
    title: 'Track Time',
    subtitle: 'Clock in and out with GPS precision. Know exactly where your crew is working.',
    color: '#16a34a',
  },
  {
    icon: ClipboardList,
    title: 'Log Daily Work',
    subtitle: 'Capture daily progress with photos, weather, and crew details — all from the field.',
    color: '#1d4ed8',
  },
  {
    icon: ShieldCheck,
    title: 'Stay Safe',
    subtitle: 'Report safety incidents instantly. Keep your team protected and compliant.',
    color: '#dc2626',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login');
  }

  function next() {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      finish();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        {/* Skip */}
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 10 }}>
          <TouchableOpacity onPress={finish}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={{ width, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
              <View style={{
                width: 100, height: 100, borderRadius: 50,
                backgroundColor: colors.surface,
                justifyContent: 'center', alignItems: 'center',
                marginBottom: 32,
              }}>
                <item.icon size={48} color={item.color} />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 16 }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 24 }}>
                {item.subtitle}
              </Text>
            </View>
          )}
        />

        {/* Dots + Next button */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 32, gap: 24 }}>
          {/* Dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={{
                  width: activeIndex === i ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: activeIndex === i ? colors.blue : colors.border,
                }}
              />
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity
            onPress={next}
            style={{
              backgroundColor: colors.blue,
              padding: 16,
              borderRadius: radii.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {activeIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <ChevronRight size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Check if onboarding has been completed.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}
