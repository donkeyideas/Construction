import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme/ThemeContext';

const BASE_URL = 'https://construction-gamma-six.vercel.app';

type Page = 'privacy' | 'terms';

export default function LegalScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [page, setPage] = useState<Page>('privacy');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Legal</Text>
      </View>

      {/* Tab toggle */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity
          onPress={() => setPage('privacy')}
          style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: page === 'privacy' ? colors.blue : 'transparent', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: page === 'privacy' ? '600' : '400', color: page === 'privacy' ? colors.blue : colors.muted }}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPage('terms')}
          style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: page === 'terms' ? colors.blue : 'transparent', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: page === 'terms' ? '600' : '400', color: page === 'terms' ? colors.blue : colors.muted }}>
            Terms of Service
          </Text>
        </TouchableOpacity>
      </View>

      <WebView
        source={{ uri: `${BASE_URL}/p/${page}` }}
        style={{ flex: 1, backgroundColor: colors.bg }}
      />
    </SafeAreaView>
  );
}
