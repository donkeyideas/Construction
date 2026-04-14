import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Wrench } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const FILTERS = ['All', 'Available', 'In Use', 'Maintenance', 'Retired'];

export default function EquipmentListScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    let query = supabase
      .from('equipment')
      .select('id, name, equipment_type, status, serial_number, make, model')
      .eq('company_id', userCompany.companyId)
      .order('name');

    if (filter === 'Available') query = query.eq('status', 'available');
    else if (filter === 'In Use') query = query.eq('status', 'in_use');
    else if (filter === 'Maintenance') query = query.eq('status', 'maintenance');
    else if (filter === 'Retired') query = query.eq('status', 'retired');

    const { data } = await query;
    setEquipment(data ?? []);
    setLoading(false);
  }, [userCompany, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const filtered = search
    ? equipment.filter((e) => e.name?.toLowerCase().includes(search.toLowerCase()))
    : equipment;

  const statusColor = (s: string) =>
    s === 'available' ? colors.green :
    s === 'in_use' ? colors.blue :
    s === 'maintenance' ? colors.amber : colors.muted;

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
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>Equipment</Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12 }}>
          <Search size={18} color={colors.muted} />
          <TextInput
            style={{ flex: 1, padding: 11, fontSize: 14, color: colors.text }}
            placeholder="Search equipment..."
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
            style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: filter === f ? colors.blue : colors.border, backgroundColor: colors.cardBg }}
          >
            <Text style={{ fontSize: 12, fontWeight: filter === f ? '600' : '400', color: filter === f ? colors.blue : colors.muted }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {filtered.map((eq: any) => (
          <View key={eq.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Wrench size={20} color={colors.amber} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{eq.name}</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                {[eq.make, eq.model].filter(Boolean).join(' ') || eq.equipment_type || 'Equipment'}
                {eq.serial_number ? ` · SN: ${eq.serial_number}` : ''}
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor(eq.status), textTransform: 'uppercase' }}>
              {eq.status?.replace(/_/g, ' ')}
            </Text>
          </View>
        ))}
        {filtered.length === 0 && (
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No equipment found</Text>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
