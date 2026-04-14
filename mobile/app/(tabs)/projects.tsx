import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Plus, Search } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const FILTERS = ['All', 'Active', 'Planning', 'On Hold', 'Completed'];

export default function ProjectsScreen() {
  const router = useRouter();
  const { colors, radii, spacing } = useTheme();
  const { userCompany } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!userCompany) return;
    let query = supabase
      .from('projects')
      .select('id, name, code, address_line1, city, state, status, budget, estimated_completion_pct')
      .eq('company_id', userCompany.companyId)
      .order('name');

    if (filter === 'Active') query = query.eq('status', 'active');
    else if (filter === 'Planning') query = query.eq('status', 'pre_construction');
    else if (filter === 'On Hold') query = query.eq('status', 'on_hold');
    else if (filter === 'Completed') query = query.eq('status', 'completed');

    const { data } = await query;
    setProjects(data ?? []);
  }, [userCompany, filter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  const statusColor = (s: string) =>
    s === 'active' ? colors.green :
    s === 'pre_construction' ? colors.amber :
    s === 'on_hold' ? colors.red : colors.muted;

  const statusLabel = (s: string) =>
    s === 'pre_construction' ? 'PLANNING' : s?.replace(/_/g, ' ').toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Projects</Text>
        <TouchableOpacity style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' }}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12 }}>
          <Search size={18} color={colors.muted} />
          <TextInput
            style={{ flex: 1, padding: 11, fontSize: 14, color: colors.text }}
            placeholder="Search projects..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: filter === f ? colors.blue : colors.border,
              backgroundColor: colors.cardBg,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: filter === f ? '600' : '400', color: filter === f ? colors.blue : colors.muted }}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {filtered.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: radii.lg,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/(screens)/project-detail', params: { id: p.id } })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{p.name}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{p.code}</Text>
              </View>
              <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor(p.status), textTransform: 'uppercase' }}>
                {statusLabel(p.status)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              <MapPin size={12} color={colors.muted} />
              <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
                {[p.address_line1, p.city, p.state].filter(Boolean).join(', ') || 'No address'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                Budget: <Text style={{ fontWeight: '600', color: colors.text }}>
                  {p.budget ? `$${(p.budget / 1e6).toFixed(1)}M` : '—'}
                </Text>
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                Completion: <Text style={{ fontWeight: '600', color: colors.text }}>
                  {p.estimated_completion_pct ?? 0}%
                </Text>
              </Text>
            </View>
            {/* Progress bar */}
            <View style={{ marginTop: 10, height: 6, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: (p.estimated_completion_pct ?? 0) > 80 ? colors.green : colors.blue, width: `${Math.min(p.estimated_completion_pct ?? 0, 100)}%` }} />
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
