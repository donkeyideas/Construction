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
import { ArrowLeft, Search, Phone, Mail, User } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function PeopleDirectoryScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, company_name, job_title, contact_type')
      .eq('company_id', userCompany.companyId)
      .eq('is_active', true)
      .order('last_name');
    setContacts(data ?? []);
    setLoading(false);
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const filtered = search
    ? contacts.filter((c) =>
        `${c.first_name} ${c.last_name} ${c.company_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

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
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>People</Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12 }}>
          <Search size={18} color={colors.muted} />
          <TextInput
            style={{ flex: 1, padding: 11, fontSize: 14, color: colors.text }}
            placeholder="Search people..."
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
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No contacts found</Text>
        ) : (
          filtered.map((c: any) => (
            <View key={c.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                  {(c.first_name?.[0] ?? '').toUpperCase()}{(c.last_name?.[0] ?? '').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {c.first_name} {c.last_name}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {c.job_title ?? c.contact_type ?? ''}
                  {c.company_name ? ` · ${c.company_name}` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {c.phone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                    <Phone size={18} color={colors.green} />
                  </TouchableOpacity>
                )}
                {c.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${c.email}`)}>
                    <Mail size={18} color={colors.blue} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
