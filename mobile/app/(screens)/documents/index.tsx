import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, FileText, File, Image as ImageIcon, Download } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function DocumentsScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const { data } = await supabase
      .from('documents')
      .select('id, file_name, file_type, file_size, category, created_at, project_id, projects(name)')
      .eq('company_id', userCompany.companyId)
      .order('created_at', { ascending: false })
      .limit(50);
    setDocuments(data ?? []);
    setLoading(false);
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const filtered = search
    ? documents.filter((d) => d.file_name?.toLowerCase().includes(search.toLowerCase()))
    : documents;

  const fileIcon = (type: string) => {
    if (type?.startsWith('image')) return ImageIcon;
    return FileText;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Documents</Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12 }}>
          <Search size={18} color={colors.muted} />
          <TextInput
            style={{ flex: 1, padding: 11, fontSize: 14, color: colors.text }}
            placeholder="Search documents..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {filtered.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No documents found</Text>
        ) : (
          filtered.map((doc: any) => {
            const Icon = fileIcon(doc.file_type);
            return (
              <View key={doc.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon size={20} color={colors.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>
                    {doc.file_name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {(doc.projects as any)?.name ?? doc.category ?? ''}
                    {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                    {doc.created_at ? ` · ${new Date(doc.created_at).toLocaleDateString()}` : ''}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
