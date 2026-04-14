import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Calendar, DollarSign } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function TenantLeaseScreen() {
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userCompany) return;
    const { data } = await supabase
      .from('leases')
      .select('id, lease_type, status, start_date, end_date, monthly_rent, security_deposit, tenant_name, properties(name), units(unit_number)')
      .eq('company_id', userCompany.companyId)
      .order('start_date', { ascending: false })
      .limit(20);
    setLeases(data ?? []);
    setLoading(false);
  }, [userCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Lease Details</Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {leases.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <FileText size={36} color={colors.muted} />
            <Text style={{ color: colors.muted }}>No lease information available</Text>
          </View>
        ) : (
          leases.map((lease: any) => (
            <View key={lease.id} style={{ backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  {(lease.properties as any)?.name ?? 'Property'}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: lease.status === 'active' ? colors.green : colors.muted, textTransform: 'uppercase' }}>
                  {lease.status}
                </Text>
              </View>

              <Row icon={FileText} label="Type" value={lease.lease_type?.replace(/_/g, ' ') ?? '—'} colors={colors} />
              <Row icon={Calendar} label="Start" value={lease.start_date ? new Date(lease.start_date).toLocaleDateString() : '—'} colors={colors} />
              <Row icon={Calendar} label="End" value={lease.end_date ? new Date(lease.end_date).toLocaleDateString() : '—'} colors={colors} />
              <Row icon={DollarSign} label="Monthly Rent" value={lease.monthly_rent ? fmt(lease.monthly_rent) : '—'} colors={colors} />
              <Row icon={DollarSign} label="Deposit" value={lease.security_deposit ? fmt(lease.security_deposit) : '—'} colors={colors} />
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon: Icon, label, value, colors }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <Icon size={16} color={colors.muted} />
      <Text style={{ fontSize: 12, color: colors.muted, width: 90 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text, flex: 1 }}>{value}</Text>
    </View>
  );
}
