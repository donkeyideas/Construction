import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search as SearchIcon,
  Building2,
  Users,
  FileText,
  Wrench,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { apiCall } from '@/lib/supabase';

const ICON_MAP: Record<string, any> = {
  project: Building2,
  contact: Users,
  invoice: FileText,
  equipment: Wrench,
  rfi: AlertCircle,
  change_order: FileText,
  submittal: FileText,
  document: FileText,
};

export default function SearchScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) return;
    setLoading(true);
    setSearched(true);
    const { data } = await apiCall<any[]>(`/api/search?q=${encodeURIComponent(q)}&limit=30`);
    setResults(data ?? []);
    setLoading(false);
  }, []);

  function handleSubmit() {
    doSearch(query.trim());
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border }}>
          <SearchIcon size={18} color={colors.muted} />
          <TextInput
            style={{ flex: 1, padding: 10, fontSize: 14, color: colors.text }}
            placeholder="Search everything..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        {loading && <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: 40 }} />}

        {!loading && searched && results.length === 0 && (
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>
            No results found for "{query}"
          </Text>
        )}

        {!loading && results.map((r: any, i: number) => {
          const Icon = ICON_MAP[r.type] ?? FileText;
          return (
            <TouchableOpacity
              key={`${r.type}-${r.id}-${i}`}
              style={{
                backgroundColor: colors.cardBg,
                borderRadius: radii.md,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              activeOpacity={0.7}
            >
              <Icon size={18} color={colors.blue} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>
                  {r.name ?? r.title ?? r.subject ?? 'Untitled'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted, textTransform: 'capitalize' }}>
                  {r.type?.replace(/_/g, ' ')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {!searched && !loading && (
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>
            Search projects, contacts, invoices, equipment, and more
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
